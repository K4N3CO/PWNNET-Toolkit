[![Screenshot-20260528-172644-Bazaart.jpg](https://i.postimg.cc/FsFhjMXz/Screenshot-20260528-172644-Bazaart.jpg)](https://postimg.cc/s18Fz0XC)

[![homescreen.png](https://i.postimg.cc/BZgFgfkK/homescreen.png)](https://postimg.cc/Jtstrv1r)

# PWN//NET-Toolkit

**PWN//NET** is an **ethical bug-hunting** and **networking toolkit** designed for **security researchers, penetration testers, and enthusiasts**. From identifying **critical vulnerabilities** to uncovering **hidden attack surfaces**, **PWN//NET** equips you with **45+ real-world scanners and diagnostic tools** to find **exploitable bugs**, **exposed secrets**, and **misconfigurations** — all in a **clean, responsive interface**.

Whether you're a **beginner** learning the ropes of **ethical hacking** or a **seasoned professional** hunting for **bounties** on production **targets**, **PWN//NET** provides the **advanced reconnaissance** capabilities you need to **succeed**.

#### **Available on Web + Android APK**

---

## ✨ Core Features

### 🧰 **Tools Grid** - **47 ready-to-use tools including**:

- Web Crawler
- Hash Cracker
- CVE Database & ExploitDB
- AI Vulnerability Analyzer
- Subdomain Enumeration
- JS Secrets & Endpoint Scanner
- CORS Misconfiguration Audit
- Extensive Dork tool
- WordPress Scanner
- Admin Finder
- Have I Been Pwned
- Phone Crawler
- NFC & Bluetooth
- Port Scanning
- Payload Studio
- And many more...

### **🐞 Ethical Bug Hunting**

**Purpose-built for security researchers, beginners**, and **seasoned professionals** to **identify real attack vectors** like **exposed API keys, subdomains**, and **loose CORS policies**.

- **Live Terminal** — **Real-time command output** so you can **see exactly what’s happening under the hood**.
- **Logs System** — **Automatically saves your activity and results** for **later review**.

### **📚 Learning Resources**

#### **Built-in references**:

- Default Credentials *(usernames & passwords for routers, cameras, IoT devices etc...)*
- Common Ports
- OSI Model
- Nmap Cheat Sheet
- OWASP Top 10
- And more

---

## 📸 **Screenshots**

<a href='https://postimg.cc/WDc6v9CG' target='_blank'><img src='https://i.postimg.cc/WDc6v9CG/PWNNET-ICON5.jpg' border='0' alt='PWNNET-ICON5'></a>  <a href="https://postimg.cc/zyvSL93G" target="_blank"><img src="https://i.postimg.cc/zyvSL93G/Screenshot-2026-06-21-at-5-34-23-AM.png" alt="Screenshot-2026-06-21-at-5-34-23-AM"></a> <a href="https://postimg.cc/CR5HZWdM" target="_blank"><img src="https://i.postimg.cc/CR5HZWdM/Screenshot-2026-06-21-at-5-35-11-AM.png" alt="Screenshot-2026-06-21-at-5-35-11-AM"></a> <a href="https://postimg.cc/xX8ykWq0" target="_blank"><img src="https://i.postimg.cc/xX8ykWq0/Screenshot-2026-06-21-at-5-35-54-AM.png" alt="Screenshot-2026-06-21-at-5-35-54-AM"></a> <a href="https://postimg.cc/qNqXt9g4" target="_blank"><img src="https://i.postimg.cc/qNqXt9g4/Screenshot-2026-06-21-at-5-36-11-AM.png" alt="Screenshot-2026-06-21-at-5-36-11-AM"></a>

---

## 📱 **Mobile App (Android)**

1. **Download** the **latest** `.apk` from the [Releases](https://github.com/K4N3CO/PWNNET-Toolkit/releases) page.
2. **Enable "Install from Unknown Sources"** in your Android **security** settings.
3. **Install**, then **Open** the app.

> **Note**: The **mobile version** is **perfect** for **on-the-go** network **reconnaissance**.

---

## 🚀 **Run Locally (On PC)**

```bash
# 1. Clone the repository
git clone https://github.com/K4N3CO/PWNNET-Toolkit.git
```
```bash
# 2. Navigate into the project
cd PWNNET-Toolkit-main
```
```bash
# 3. Install dependencies
npm install
```
```bash
# 4. Start the development server
npm run dev
```
### **To open app:**

**Click** the **URL** shown in the **terminal** *(usually http://localhost:3000 or http://0.0.0.0:3000)*.

---

## 🛠️ **Tech Stack**

| Layer          | Technology                          |
|----------------|-------------------------------------|
| **Frontend**   | React + TypeScript + Vite           |
| **Backend**    | Express + Node.js (Proxy & APIs)    |
| **Styling**    | Tailwind CSS                        |
| **Mobile**     | Capacitor (Android/Java WebView)    |
| **Utilities**  | Node.js                             |

---

## 📱 Android Build (Capacitor)
This project uses **Capacitor** to wrap the web app into a **native Android project**. The **native** code is **located** in the `android/` folder, which can be **opened directly** in **Android Studio**.

To **build and sync** the **latest web code** to the **Android project**:
```bash
# 1. Build the frontend web bundle
npm run build
```
```bash
# 2. Sync the built files and plugins to the Android project
npx cap sync android
```
```bash
# 3. Open in Android Studio
npx cap open android
```

---

## 📌 **Roadmap / Future Plans**

- **Add** more **advanced tools** *(vulnerability scanning, packet crafting, etc.)*
- **Export** results as **PDF**, **JSON**, or **CSV**
- **Desktop** application using **Electron**

---

## ⭐ **Support the Development**

If you find the **PWN//NET-Toolkit** **useful for your security research**, **please Star ⭐ the project**—it **drives further development!!**

### **Contributions:**

**Bug reports, add new feature** and **pull requests** are **always welcome!**.

### **Donations:**

<img src="https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black">

**https://buymeacoffee.com/k4n3co**


<img src="https://img.shields.io/badge/Donate-Bitcoin-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white">

```
bc1q6lmkuju3kf7f8624fwt5qs7k5mf63mekgcnzf4
```

---

## ⚠️ **Disclaimer**

This tool is for **educational and authorized security testing purposes ONLY!**. The **developers & contributors** assume **NO responsibility** for **ANY** **misuse or damage** caused by **this software**. **Please use it responsibly**. **Thank you!**


---

## 🪪 **License**

This project is **licensed** to **K4N3CO** under the [MIT License](LICENSE).

---

<p align="center">
  <b><img src="https://img.shields.io/badge/Developed By-K4N3CO.LABS ©2026-darkred?style=for-the-badge&logo=maserati&logoColor=white">
</b><br>

<p align="center"> 
<b><img src="https://img.shields.io/badge/The one's who MIND don't matter-The one's who MATTER don't mind-cyan?style=for-the-badge&logo=counterstrike&logoColor=white">
