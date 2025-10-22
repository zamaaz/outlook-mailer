import { useState, useEffect, useRef } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Slider } from "./components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Label } from "./components/ui/label";
import {
  Send,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Paperclip,
  Upload,
  LogIn,
  LogOut,
  ListChecks,
  FileText,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "./components/ui/theme-toggle";

/* ---------- Helper & Auth Component ---------- */
const getInitials = (name: string) => {
  if (!name) return "U";
  const names = name.split(" ");
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const AuthComponent = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch((e) => console.error(e));
  };
  const handleLogout = () => {
    instance.logoutPopup({ postLogoutRedirectUri: "/" });
  };

  if (isAuthenticated && accounts[0]) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-3 sm:gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarFallback>
                  {getInitials(accounts[0].name || "U")}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{accounts[0].name}</p>
              <p className="text-background">{accounts[0].username}</p>
            </TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </TooltipProvider>
    );
  }
  return (
    <Button onClick={handleLogin}>
      <LogIn className="w-4 h-4 mr-2" />
      Login with Microsoft
    </Button>
  );
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

/* ---------- Main Application Component ---------- */
export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [recipientsFile, setRecipientsFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("Important Company Update");
  const [delay, setDelay] = useState<number>(5);
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<
    { email: string; status: string; time: string }[]
  >([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [bodyText, setBodyText] = useState<string>("");

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024;

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;

    if (!file) {
      setAttachmentFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `Attachment is too large. Please select a file under 4.5 MB.`
      );
      setAttachmentFile(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      return;
    }

    setFileError(null);
    setAttachmentFile(file);
  };

  const handleClear = () => {
    setRecipientsFile(null);
    setAttachmentFile(null);
    setSubject("");
    setBodyText("");
    setDelay(5);
    setStatus("idle");
    setFileError(null);
    setShowLogs(false);
    setLogs([]);
    setSentCount(0);
    setFailedCount(0);
    setResults([]);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setLogs((prev) => [...prev, "--- Process cancelled by user. ---"]);
  };

  const handleSend = async () => {
    if (!recipientsFile) {
      setFileError("Please select a recipient Excel file.");
      return;
    }

    setFileError(null);
    setLogs([]);
    setResults([]);
    setShowLogs(true);
    setStatus("sending");
    setLogs(["Starting process..."]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      const formData = new FormData();
      formData.append("recipientsFile", recipientsFile);
      if (attachmentFile) formData.append("attachmentFile", attachmentFile);
      formData.append("subject", subject);
      formData.append("bodyText", bodyText);
      formData.append("delay", String(delay));

      const response = await fetch(`${API_BASE_URL}/send-emails-stream`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
        body: formData,
        signal: controller.signal,
      });

      if (!response.body) throw new Error("Response body is missing.");

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;
        const parts = buffer.split("\n\n");

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (part.startsWith("data: ")) {
            const jsonString = part.substring(6);
            const parsedData = JSON.parse(jsonString);
            const { type, data } = parsedData;

            if (type === "log") {
              setLogs((prev) => [...prev, `STATUS: ${data}`]);
            } else if (type === "progress") {
              setResults((prev) => [
                ...prev,
                {
                  email: data.email,
                  status: data.status,
                  time: new Date().toLocaleTimeString(),
                },
              ]);
              if (data.status === "sent") {
                setLogs((prev) => [...prev, `PROGRESS: Sent → ${data.email}`]);
              } else {
                setLogs((prev) => [
                  ...prev,
                  `ERROR: Failed to send to ${data.email}: ${data.error}`,
                ]);
              }
            } else if (type === "complete") {
              setStatus("success");
              setSentCount(data.sent);
              setFailedCount(data.failed);
              setLogs((prev) => [...prev, `--- ${data.message} ---`]);
            } else if (type === "error") {
              setStatus("error");
              setFileError(data.message);
              setLogs((prev) => [...prev, `FATAL: ${data.message}`]);
            }
          }
        }
        buffer = parts[parts.length - 1];
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Fetch aborted by user.");
      } else {
        setStatus("error");
        setFileError(
          "An unexpected error occurred. Check the console for details."
        );
        setLogs((prev) => [
          ...prev,
          `--- CRITICAL ERROR: ${error.message} ---`,
        ]);
        console.error(error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const isSending = status === "sending";
  const isFinished = status === "success" || status === "error";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4 sm:px-6 md:px-8 py-8 transition-all">
      <Card className="w-full max-w-[95vw] sm:max-w-[700px] md:max-w-[900px] lg:max-w-[1100px] xl:max-w-[1400px] mx-auto border shadow-lg rounded-xl bg-card/80 backdrop-blur-md p-4 m-2 sm:p-6 md:p-8 transition-all">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b gap-3 sm:gap-0 mt-6">
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <Mail className="w-7 h-7 text-primary shrink-0" />
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
                Outlook Web Mailer
              </CardTitle>
              <CardDescription className="text-xs sm:text-base">
                Send bulk emails using Microsoft Graph API
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3">
            <AuthComponent />
            <ThemeToggle />
          </div>
        </CardHeader>

        {isAuthenticated ? (
          <>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Recipients (.xlsx)
                  </Label>
                  <Input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) =>
                      setRecipientsFile(
                        e.target.files ? e.target.files[0] : null
                      )
                    }
                    disabled={isSending}
                  />
                  {recipientsFile && (
                    <p className="text-xs text-muted-foreground truncate pt-1">
                      Selected: {recipientsFile.name}
                    </p>
                  )}
                  {fileError && (
                    <p className="text-destructive text-sm mt-1">{fileError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attachment (Optional)
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      (Max 4.5 MB)
                    </span>
                  </Label>
                  <Input
                    ref={attachmentInputRef}
                    type="file"
                    onChange={handleAttachmentChange}
                    disabled={isSending}
                  />
                  {attachmentFile && (
                    <p className="text-xs text-muted-foreground truncate pt-1">
                      Attached: {attachmentFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="font-semibold">
                  Email Subject
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSending}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Body</Label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Enter email body"
                  className="w-full min-h-[200px] sm:min-h-[250px] border rounded-md p-3 font-sans text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                  disabled={isSending}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="delay" className="font-semibold">
                  Delay Between Emails
                </Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    id="delay"
                    min={1}
                    max={30}
                    step={1}
                    value={[delay]}
                    onValueChange={(v) => setDelay(v[0])}
                    disabled={isSending}
                  />
                  <span className="font-mono text-lg w-16 text-center">
                    {delay}s
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col items-stretch space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row w-full gap-3">
                <Button
                  onClick={handleSend}
                  disabled={isSending}
                  size="lg"
                  className="flex-grow bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Emails
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={!isSending}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  disabled={isSending}
                >
                  Clear
                </Button>
              </div>

              {logs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLogs(!showLogs)}
                    className="text-xs"
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    {showLogs ? "Hide Logs" : "Show Logs"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={results.length === 0}
                    onClick={() => {
                      const csvRows = [
                        ["Email", "Status", "Timestamp"],
                        ...results.map((r) => [r.email, r.status, r.time]),
                      ];
                      const csvContent =
                        "data:text/csv;charset=utf-8," +
                        csvRows.map((r) => r.join(",")).join("\n");
                      const link = document.createElement("a");
                      link.href = encodeURI(csvContent);
                      link.download = `mail_report_${new Date()
                        .toISOString()
                        .replace(/[:.]/g, "-")}.csv`;
                      link.click();
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              )}

              {showLogs && (
                <div
                  ref={logContainerRef}
                  className="mt-2 w-full p-3 bg-slate-900 rounded-md max-h-40 sm:max-h-56 md:max-h-72 overflow-y-auto text-xs font-mono"
                >
                  {logs.map((log, i) => (
                    <p
                      key={i}
                      className={
                        log.startsWith("ERROR:")
                          ? "text-red-400"
                          : log.startsWith("PROGRESS:")
                          ? "text-cyan-400"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </p>
                  ))}
                </div>
              )}

              {isFinished && (
                <Alert
                  variant={status === "success" ? "default" : "destructive"}
                  className="p-4 mt-2 flex items-start space-x-3"
                >
                  {status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertTitle className="font-bold text-base mb-1">
                      {status === "success"
                        ? "Process Completed Successfully!"
                        : "An Error Occurred"}
                    </AlertTitle>
                    <AlertDescription className="text-sm text-foreground space-y-1">
                      {status === "success" ? (
                        <>
                          <p>
                            <span className="font-medium text-green-500">
                              Sent:{" "}
                            </span>
                            {sentCount}
                          </p>
                          <p>
                            <span className="font-medium text-red-500">
                              Failed:{" "}
                            </span>
                            {failedCount}
                          </p>
                          <p className="text-xs text-muted-foreground pt-1">
                            Completed at {new Date().toLocaleTimeString()}
                          </p>
                        </>
                      ) : (
                        <p>
                          {fileError || "The process could not be completed."}
                        </p>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardFooter>
          </>
        ) : (
          <CardContent className="flex flex-col items-center justify-center text-center h-96">
            <h2 className="text-xl font-semibold">
              Welcome to the Outlook Web Mailer
            </h2>
            <p className="text-muted-foreground mt-2">
              Please log in with your Microsoft account to continue.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
