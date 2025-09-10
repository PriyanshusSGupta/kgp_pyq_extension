# 📚 PYQ Navigator Browser Extension

## Effortless Search and Download Past Year Question Papers from IIT KGP Campus Server

---

## ✨ Project Overview

The PYQ Navigator is a browser extension for Chrome and Firefox. It provides a quick, smart search interface to find and download Past Year Question Papers (PYQs) from the **IIT KGP's internal campus server**, eliminating manual folder navigation.

---

## 🚀 Features

*   **Smart Search:** Find papers by subject name/code with fuzzy matching for typos.
*   **Department Filter:** Refine searches using department codes or full names.
*   **One-Click Downloads:** Instantly save PDF papers to your computer.
*   **Persistent Search:** Remembers your last search terms.
*   **Modern UI:** Clean, minimalist design with smooth animations.
*   **Local Data:** Fast, offline-capable search using a bundled index.

---

## 💡 How It Works

The extension operates entirely in your browser:

1.  **Bundled Index:** Uses pre-generated JSON files (URLs, department map, search corpus) from campus server listings.
2.  **Client-Side Search:** Fuzzy searching (Fuse.js) and intelligent department filtering are performed locally.
3.  **Direct Downloads:** Triggers your browser's native download for PDFs directly from the campus server.

**No data is sent to external servers.**

---

## 🛠️ Installation Guide

Follow this detailed guide to install the PYQ Navigator in your browser:

👉 [**Go to the PYQ Navigator Installation Guide on Notion**](https://feather-tiglon-b07.notion.site/Installation-Guide-26aa51eedf688057973ac4157ef31369?source=copy_link)

---

## ⚡ Usage

1.  **Connect:** Ensure you are on **IIT KGP campus WiFi or VPN**.
2.  **Open Extension:** Click the "PYQ Navigator" icon in your toolbar.
3.  **Search:** Enter **Subject/Code** and optional **Department**.
4.  **Download:** Click "Download PDF" for desired papers.

---

## 🔒 Important Disclaimers

*   **Campus Network Only:** Works only with the **IIT KGP** internal server.
*   **Privacy:** **No personal data is collected, tracked, or transmitted.** All data is stored **locally** within your browser.
*   **Data Safety:** Bundled index is from publicly available directory listings; no sensitive data.

---

## 🔄 Updating Extension Data

To update papers or department names:

1.  Re-run data generation scripts (`wget`, `grep`, Python scripts).
2.  Replace updated `.json` files in the `pyq_extension` folder.
3.  Reload the extension in your browser.

---

## 🤝 Feedback & Contributions

Got bugs 🐛, feature ideas ✨, or want to contribute 🧑‍💻?
[Open an issue](https://github.com/[YourGitHubUsername]/[YourRepoName]/issues) or [submit a pull request](https://github.com/[YourGitHubUsername]/[YourRepoName]/pulls) on GitHub.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
