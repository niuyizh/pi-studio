' ===========================================================================
'  Pi Studio - silent launcher
'
'  Double-click this file (or a desktop shortcut to it) to start the local
'  server in the background and open your browser.
'
'  Node.js is located in this order:
'    1. node-path.txt next to this script (optional, one line = full path)
'    2. common install locations
'    3. "node" on PATH
'
'  If the server does not come up within ~20s a message box shows the tail of
'  data\launcher.log, so failures are easy to diagnose.
' ===========================================================================

Option Explicit

Const START_PORT = 4317
Const PORT_TRIES = 20

Dim fso, sh, appDir, nodeExe, serverJs, logDir, logPath, launcherLog
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverJs = fso.BuildPath(appDir, "server.mjs")
logDir = fso.BuildPath(appDir, "data")
logPath = fso.BuildPath(logDir, "server.log")
launcherLog = fso.BuildPath(logDir, "launcher.log")

If Not fso.FileExists(serverJs) Then
  MsgBox "Cannot find server.mjs next to this script:" & vbCrLf & serverJs, 16, "Pi Studio"
  WScript.Quit 1
End If

If Not fso.FolderExists(logDir) Then
  fso.CreateFolder(logDir)
End If

nodeExe = FindNode()
If nodeExe = "" Then
  MsgBox "Node.js was not found." & vbCrLf & vbCrLf & _
         "Please install Node.js (https://nodejs.org), or create a file named " & _
         "node-path.txt next to this script containing the full path to node.exe.", 16, "Pi Studio"
  WScript.Quit 1
End If

sh.CurrentDirectory = appDir

' --- already running? just open the browser --------------------------------
Dim existing
existing = FindServer()
If existing > 0 Then
  sh.Run "rundll32 url.dll,FileProtocolHandler http://127.0.0.1:" & existing & "/", 0, False
  WScript.Quit 0
End If

' --- start it hidden, capturing output to data\launcher.log -----------------
Dim inner, cmd
inner = """" & nodeExe & """ """ & serverJs & """ > """ & launcherLog & """ 2>&1"
cmd = "%comspec% /c """ & inner & """"

On Error Resume Next
sh.Run cmd, 0, False
If Err.Number <> 0 Then
  MsgBox "Failed to start Pi Studio." & vbCrLf & vbCrLf & _
         "Command: " & cmd & vbCrLf & "Error: " & Err.Description, 16, "Pi Studio"
  WScript.Quit 1
End If
On Error GoTo 0

' --- wait for it, then report ----------------------------------------------
Dim port, waited
port = 0
For waited = 1 To 40          ' up to ~20s
  WScript.Sleep 500
  port = FindServer()
  If port > 0 Then Exit For
Next

If port = 0 Then
  MsgBox "Pi Studio did not start." & vbCrLf & vbCrLf & _
         "Launcher output:" & vbCrLf & Tail(launcherLog, 15) & vbCrLf & _
         "Server log: " & logPath & vbCrLf & _
         "Tip: run start-debug.bat to watch the full output.", 16, "Pi Studio"
  WScript.Quit 1
End If

' The server opens the browser itself once it is listening.
WScript.Quit 0

' ===========================================================================
Function FindNode()
  Dim override, f, txt, candidates, c
  FindNode = ""

  ' 1) optional override file next to this script
  override = fso.BuildPath(appDir, "node-path.txt")
  If fso.FileExists(override) Then
    On Error Resume Next
    Set f = fso.OpenTextFile(override, 1)
    If Err.Number = 0 Then
      txt = Trim(f.ReadAll)
      f.Close
    Else
      txt = ""
      Err.Clear
    End If
    On Error GoTo 0
    If Len(txt) > 0 Then
      If fso.FileExists(txt) Then
        FindNode = txt
        Exit Function
      End If
    End If
  End If

  ' 2) common install locations
  candidates = Array( _
    sh.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe"), _
    sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%\nodejs\node.exe"), _
    sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe"), _
    sh.ExpandEnvironmentStrings("%APPDATA%\npm\node.exe"), _
    "C:\Program Files\nodejs\node.exe", _
    "C:\Program Files (x86)\nodejs\node.exe" _
  )
  For Each c In candidates
    If c <> "" Then
      If fso.FileExists(c) Then
        FindNode = c
        Exit Function
      End If
    End If
  Next

  ' 3) fall back to PATH
  FindNode = "node"
End Function

' Returns the port Pi Studio is listening on, or 0.
Function FindServer()
  Dim p, n
  FindServer = 0
  For n = 0 To PORT_TRIES - 1
    p = START_PORT + n
    If ProbePort(p) Then
      FindServer = p
      Exit Function
    End If
  Next
End Function

Function ProbePort(p)
  Dim http
  ProbePort = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.XMLHTTP.6.0")
  If Err.Number <> 0 Then
    Err.Clear
    On Error GoTo 0
    Exit Function
  End If
  http.Open "GET", "http://127.0.0.1:" & p & "/api/bootstrap", False
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then ProbePort = True
  End If
  Err.Clear
  On Error GoTo 0
End Function

' Last n non-empty lines of a text file.
Function Tail(path, n)
  Dim f, s, lines, i, out
  Tail = "(no log written)"
  On Error Resume Next
  Set f = fso.OpenTextFile(path, 1)
  If Err.Number <> 0 Then Exit Function
  s = f.ReadAll
  f.Close
  On Error GoTo 0
  If Len(s) = 0 Then
    Tail = "(log is empty)"
    Exit Function
  End If
  lines = Split(Replace(s, vbCrLf, vbLf), vbLf)
  out = ""
  For i = LBound(lines) To UBound(lines)
    If i >= UBound(lines) + 1 - n Then
      If Len(Trim(lines(i))) > 0 Then out = out & lines(i) & vbCrLf
    End If
  Next
  If out = "" Then out = "(log is empty)"
  Tail = out
End Function
