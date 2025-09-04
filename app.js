import express from "express";
import Database from "better-sqlite3";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";

const __dirname = path.resolve();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

if (!fs.existsSync("data.db")) fs.writeFileSync("data.db", "");
const db = new Database("data.db");

db.exec(`
DROP TABLE IF EXISTS posts;
CREATE TABLE posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  const posts = db.prepare(`SELECT * FROM posts ORDER BY created_at DESC`).all();

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>NepaGram Free Chats</title>
    <style>
      body { font-family: Arial,sans-serif; background:#f4f4f4; max-width:700px; margin:40px auto; padding:20px; }
      h1 { text-align:center; color:#333; }
      #feed { background:#fff; padding:15px; border-radius:8px; border:1px solid #ddd; height:400px; overflow-y:auto; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
      .post { border-bottom:1px solid #eee; padding:5px 0; font-size:15px; }
      .username { font-weight:bold; color:#007bff; }
      #controls { display:flex; justify-content:space-between; margin-top:10px; gap:10px; }
      input, button { padding:10px; border-radius:5px; border:1px solid #ccc; font-size:14px; }
      input { flex:1; }
      button { cursor:pointer; transition:0.2s; }
      #sendBtn { background:#007bff; color:#fff; border:none; }
      #sendBtn:hover { background:#0056b3; }
      #clearBtn { background:#dc3545; color:#fff; border:none; }
      #clearBtn:hover { background:#a71d2a; }
      #loginDiv { display:flex; flex-direction:column; gap:10px; margin-bottom:15px; }
    </style>
  </head>
  <body>
    <h1>Mini Instagram Chat</h1>

    <div id="loginDiv">
      <input type="text" id="usernameInput" placeholder="Enter your name..." required>
      <button id="loginBtn">Enter Chat</button>
    </div>

    <div id="chatDiv" style="display:none;">
      <div id="feed">
        ${posts.map(p => `
          <div class="post">
            <span class="username">${p.username}</span>: ${p.text}
          </div>
        `).join("")}
      </div>

      <form id="postForm">
        <input id="textInput" placeholder="Write a message..." required>
        <button id="sendBtn">Send</button>
      </form>

      <div id="controls">
        <button id="clearBtn">Clear All Messages</button>
      </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      const feed = document.getElementById("feed");
      const postForm = document.getElementById("postForm");
      const textInput = document.getElementById("textInput");
      const clearBtn = document.getElementById("clearBtn");

      const loginDiv = document.getElementById("loginDiv");
      const chatDiv = document.getElementById("chatDiv");
      const usernameInput = document.getElementById("usernameInput");
      const loginBtn = document.getElementById("loginBtn");

      let username = "";

      loginBtn.onclick = () => {
        if(usernameInput.value.trim() === "") return alert("Enter your name!");
        username = usernameInput.value.trim();
        loginDiv.style.display = "none";
        chatDiv.style.display = "block";
      };

      postForm.onsubmit = e => {
        e.preventDefault();
        if(!username) return alert("Enter your name first!");
        fetch("/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, text: textInput.value })
        });
        textInput.value = "";
      };

      clearBtn.onclick = () => {
        fetch("/clear", { method: "POST" });
      };

      socket.on("new_post", post => {
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML = "<span class='username'>" + post.username + "</span>: " + post.text;
        feed.prepend(div);
      });

      socket.on("clear_feed", () => {
        feed.innerHTML = "";
      });
    </script>
  </body>
  </html>
  `);
});

// Posting
app.post("/post", (req, res) => {
  const { username, text } = req.body;
  const stmt = db.prepare("INSERT INTO posts(username,text) VALUES(?,?)");
  stmt.run(username || "Anonymous", text);
  io.emit("new_post", { username: username || "Anonymous", text });
  res.sendStatus(200);
});

app.post("/clear", (req, res) => {
  db.prepare("DELETE FROM posts").run();
  io.emit("clear_feed");
  res.sendStatus(200);
});

server.listen(PORT, () => console.log("Running on http://localhost:" + PORT));
