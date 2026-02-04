let currentChatUser = null;

/**
 * loadConversations
 * Loads the list of conversations (one row per user with last message).
 */

async function loadConversations() {
  const listEl = document.getElementById("conversation-list");
  if (!listEl) return;

  try {
    const data = await jsonFetch(`/${M01031166}/conversations`);
    const convs = data.results || [];

    listEl.innerHTML = "";
    if (!convs.length) {
      listEl.innerHTML = "<li>No conversations yet.</li>";
      return;
    }

    convs.forEach(conv => {
      const li = document.createElement("li");
      const username = conv._id;
      li.textContent = `@${username}: ${conv.lastMessage}`;
      li.dataset.username = username;

      li.addEventListener("click", () => {
        startConversationWith(username);
      });

      listEl.appendChild(li);
    });
  } catch (err) {
    showFlash(err.message || "Could not load conversations", "error");
  }
}

/**
 * loadMessagesWith
 * Loads all messages in a conversation with a given username.
 */
async function loadMessagesWith(username) {
  const threadEl = document.getElementById("messages-thread");
  const headerEl = document.getElementById("messages-with");
  if (!threadEl || !headerEl) return;

  try {
    const data = await jsonFetch(
      `/${M01031166}/messages?with=${encodeURIComponent(username)}`
    );
    const msgs = data.results || [];

    headerEl.textContent = `Chat with @${username}`;
    threadEl.innerHTML = "";

    if (!msgs.length) {
      threadEl.innerHTML = "<p>No messages yet. Say hi!</p>";
      return;
    }

    msgs.forEach(msg => {
      const div = document.createElement("div");
      div.className = "message-bubble";
      const isMine = msg.from !== username; 
      div.style.textAlign = isMine ? "right" : "left";
      div.textContent = `${msg.from}: ${msg.text}`;
      threadEl.appendChild(div);
    });

    threadEl.scrollTop = threadEl.scrollHeight;
  } catch (err) {
    showFlash(err.message || "Could not load messages", "error");
  }
}

/**
 * startConversationWith
 * Switches to messages section and loads chat with a user.
 */
function startConversationWith(username) {
  currentChatUser = username;
  showSection("messages-section");
  setActiveNav("messages-section");
  loadMessagesWith(username);
  loadConversations();
}

/**
 * initMessages
 * Wires up the message form to send messages to the currentChatUser.
 */
function initMessages() {
  const form = document.getElementById("message-form");
  const textArea = document.getElementById("message-text");
  if (!form || !textArea) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentChatUser) {
      showFlash("Select a conversation or start from user search", "error");
      return;
    }

    const text = textArea.value.trim();
    if (!text) return;

    try {
      await jsonFetch(`/${M01031166}/messages`, {
        method: "POST",
        body: JSON.stringify({ to: currentChatUser, text })
      });
      textArea.value = "";
      await loadMessagesWith(currentChatUser);
      await loadConversations();
    } catch (err) {
      showFlash(err.message || "Could not send message", "error");
    }
  });
}