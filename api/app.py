import os
import sys
import base64
import json
import time
import re
import traceback
import requests
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from openpyxl import load_workbook
from io import BytesIO
from threading import Thread
from queue import Queue


app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
# Allow requests from your React app's origin
CORS(app, resources={r"/api/*": {"origins": [FRONTEND_URL, "http://localhost:5173"]}})

def log(msg):
    print(msg, flush=True)

def is_valid_email(addr):
    return isinstance(addr, str) and re.match(r"[^@]+@[^@]+\.[^@]+", addr)

def read_recipients_from_bytes(file_bytes):
    try:
        wb = load_workbook(filename=BytesIO(file_bytes), read_only=True)
        ws = wb.active
        header = [str(c.value).strip().lower() if c.value else "" for c in next(ws.iter_rows(min_row=1, max_row=1))]
        email_col_idx = 0
        for i, h in enumerate(header):
            if h in {"email", "emails", "recipient", "recipients"}:
                email_col_idx = i
                break

        emails = [
            str(row[email_col_idx].value).strip()
            for row in ws.iter_rows(min_row=2)
            if row[email_col_idx].value and is_valid_email(str(row[email_col_idx].value))
        ]
        wb.close()
        return emails
    except Exception as e:
        log(f"Error reading Excel file: {e}")
        return None


@app.route("/api/send-emails-stream", methods=["POST"])
def stream_emails():
    # ✅ FIX 1: Read the file contents into memory immediately.
    recipients_file = request.files.get('recipientsFile')
    recipients_bytes = recipients_file.read() if recipients_file else None

    attachment_file = request.files.get('attachmentFile')
    attachment_bytes = attachment_file.read() if attachment_file else None
    attachment_filename = attachment_file.filename if attachment_file else None

    # Get the rest of the form data
    auth_header = request.headers.get("Authorization")
    subject = request.form.get("subject")
    body_html = request.form.get("bodyHtml")
    delay = int(request.form.get("delay", 5))

    # ✅ FIX 2: Define the generator to accept the file bytes and filename.
    def generate_events(token_header, sub, body, del_val, rec_bytes, att_bytes, att_filename):
        
        def format_event(event_type, data):
            payload = json.dumps({"type": event_type, "data": data})
            return f"data: {payload}\n\n"
            
        try:
            # --- 1. Validation and Setup ---
            if not token_header:
                 yield format_event("error", {"message": "Authorization header is missing."})
                 return
            token = token_header.split(" ")[1]

            if not rec_bytes:
                yield format_event("error", {"message": "Recipients file is required."})
                return

            # Use the bytes directly
            recipients = read_recipients_from_bytes(rec_bytes)
            if not recipients:
                yield format_event("error", {"message": "Could not read valid recipients from the Excel file."})
                return
            
            yield format_event("log", f"Loaded {len(recipients)} recipients.")

            # --- 2. Process emails and stream logs ---
            endpoint = "https://graph.microsoft.com/v1.0/me/sendMail"
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            success_count, fail_count = 0, 0
            
            attachment_content_base64 = None
            if att_bytes and att_filename:
                attachment_content_base64 = base64.b64encode(att_bytes).decode('utf-8')

            for email in recipients:
                email_msg = { "message": { "subject": sub, "body": {"contentType": "HTML", "content": body}, "toRecipients": [{"emailAddress": {"address": email}}], "attachments": [] }, "saveToSentItems": "true" }
                
                if attachment_content_base64:
                    email_msg["message"]["attachments"].append({ "@odata.type": "#microsoft.graph.fileAttachment", "name": att_filename, "contentBytes": attachment_content_base64 })

                response = requests.post(endpoint, headers=headers, data=json.dumps(email_msg))

                if response.status_code == 202:
                    success_count += 1
                    yield format_event("progress", {"email": email, "status": "sent"})
                else:
                    fail_count += 1
                    yield format_event("progress", {"email": email, "status": "failed", "error": response.text})
                
                time.sleep(del_val)

            # --- 3. Send final completion event ---
            yield format_event("complete", { "sent": success_count, "failed": fail_count, "message": "Process completed." })

        except Exception as e:
            traceback.print_exc()
            yield format_event("error", {"message": str(e)})

    return Response(generate_events(
        auth_header, subject, body_html, delay, recipients_bytes, attachment_bytes, attachment_filename
    ), mimetype='text/event-stream')

# if __name__ == "__main__":
#     app.run(port=5000, debug=True)