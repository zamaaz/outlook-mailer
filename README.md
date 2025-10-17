# Outlook Web Mailer 📧

A modern, secure web application for sending bulk emails using the Microsoft Graph API. This tool allows users to log in with their Microsoft account, upload a list of recipients from an Excel file, compose an email with an optional attachment, and send them with a specified delay. The application provides real-time progress logs and a downloadable report of sent/failed emails.

This project is built with a React (Vite) frontend and a Python (Flask) backend, optimized for easy deployment on Vercel.

---

## ✨ Features

- **Microsoft Authentication**: Secure login using Microsoft accounts (MSAL).
- **Bulk Emailing**: Upload an `.xlsx` or `.xls` file with a list of recipient email addresses.
- **Rich Text Editor**: Compose professional-looking HTML emails.
- **Attachments**: Include a single optional attachment with your email blast.
- **Adjustable Delay**: Set a custom delay between each email to avoid rate-limiting.
- **Live Progress Tracking**: A real-time log panel shows the status of each email being sent.
- **Downloadable Reports**: Get a CSV report of which emails were sent successfully and which failed.
- **Responsive Design**: A clean, modern UI that works on all screen sizes.
- **Light/Dark Mode**: A theme toggle for user preference.

---

## 🛠️ Tech Stack

- **Frontend**:

  - [React](https://react.dev/) (with Vite)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/) for components
  - `@azure/msal-react` for Microsoft Authentication

- **Backend**:

  - [Python](https://www.python.org/)
  - [Flask](https://flask.palletsprojects.com/) for the web server & API
  - `requests` for calling the Microsoft Graph API
  - `openpyxl` for reading Excel files

- **Deployment**:

  - [Vercel](https://vercel.com/) (Serverless Functions for the backend, static hosting for the frontend)

---

## 🚀 Setup and Installation

Follow these steps to run the project locally for development.

### 1\. Clone the Repository

```bash
git clone https://github.com/zamaaz/outlook-mailer.git
cd outlook-mailer
```

### 2\. Configure Azure AD App Registration

Before running the app, you need to register it in Azure Active Directory (Microsoft Entra ID):

1.  Go to the [Azure Portal](https://portal.azure.com/) and navigate to **Microsoft Entra ID \> App registrations \> New registration**.
2.  Give your application a name.
3.  For "Supported account types," choose **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)**.
4.  For the "Redirect URI," select **Single-page application (SPA)** and enter `http://localhost:5173`.
5.  Click **Register**.
6.  Copy the **Application (client) ID** – you'll need it for your environment variables.
7.  Go to the **Authentication** tab for your new app and add your production URI (e.g., `https://your-app.vercel.app`) to the SPA platform list.

### 3\. Frontend Setup

```bash
# Navigate to the frontend directory
# (Assuming your React code is in the root)

# Install dependencies
npm install

# Create a local environment file
touch .env.local
```

Now, add the following variables to your `.env.local` file:

```
# .env.local

VITE_MSAL_CLIENT_ID="your-azure-client-id"
VITE_API_URL="http://localhost:5000/api"
VITE_REDIRECT_URI="http://localhost:5173"
```

### 4\. Backend Setup

```bash
# Navigate to the backend directory
cd api

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies from the root requirements.txt
pip install -r ../requirements.txt
```

### 5\. Running the Application

1.  **Start the Backend Server**: In your terminal (with the virtual environment activated), run:

    ```bash
    flask run
    ```

    The backend will start on `http://localhost:5000`.

2.  **Start the Frontend Server**: In a **new** terminal window, run:

    ```bash
    npm run dev
    ```

    The frontend will be available at `http://localhost:5173`.

---

## 🌐 Deployment on Vercel

This project is structured for a seamless deployment to Vercel.

### 1\. Project Structure

Ensure your project follows this structure:

```
/
├── api/
│   └── app.py
├── src/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vercel.json
└── requirements.txt
```

### 2\. Vercel Configuration

Push your repository to GitHub and import it into Vercel. Vercel will automatically use the `vercel.json` and `package.json` files to configure the build.

### 3\. Environment Variables

In your Vercel project's **Settings \> Environment Variables**, add the following:

- `VITE_MSAL_CLIENT_ID`: Your Azure App's Client ID.
- `FRONTEND_URL`: Your full Vercel production URL (e.g., `https://your-project.vercel.app`). This is required for the backend's CORS policy.

Vercel will automatically deploy your project upon creation and on every subsequent push to the main branch.
