# 🚀 ResumeAI

<div align="center">

### **AI-Powered Resume Builder for the Modern Job Seeker**

Build ATS-optimized resumes with intelligent GitHub integration and smart project selection

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)](http://localhost:3001)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10.7-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

</div>

---

## ✨ Features

### 🎯 **Smart Resume Generation**
- **AI Career Memory** - Upload resumes and build an intelligent knowledge base
- **Job Role Matching** - Select from 40+ predefined roles or create custom ones
- **Quantified Achievements** - AI generates bullet points with metrics and impact

### 🔗 **GitHub Integration**
- **One-Click Connection** - Link your GitHub account securely
- **Automated Analysis** - AI analyzes all repositories with progress tracking
- **Smart Project Selection** - Get relevance scores for each project based on target role
- **Technology Extraction** - Automatically identifies tech stacks and domains

### 📊 **ATS Optimization**
- **99% Pass Rate Target** - Strict multi-pattern ATS analysis
- **Real-Time Scoring** - See your ATS score instantly
- **Keyword Density** - Ensures optimal keyword placement
- **Formatting Compliance** - ATS-friendly structure guaranteed

### 💼 **Professional Features**
- **Multiple Auth Methods** - Google, GitHub, or Guest mode
- **Resume Templates** - Clean, modern designs
- **Live Preview** - See changes in real-time
- **PDF Export** - Download professional PDFs
- **Memory Deduplication** - Intelligent data merging

---

## 🛠️ Tech Stack

<div align="center">

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Authentication** | Firebase Auth (Google, GitHub) |
| **Database** | Cloud Firestore |
| **AI Processing** | Advanced NLP Models |
| **Icons** | Lucide React |
| **Build Tool** | Vite |

</div>

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- API key for AI services

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/resumeai.git

# Navigate to project directory
cd resumeai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

### Configuration

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 📋 Features Breakdown

### 🧠 **AI Career Memory**

Build a comprehensive knowledge base by:
- Uploading existing resumes (PDF, DOCX, TXT)
- Adding manual entries
- Connecting GitHub for automatic project extraction
- Answering AI-generated clarification questions

### 🎯 **Job Role Selection**

Choose from categories including:
- **Software Engineering** - Frontend, Backend, Full Stack, DevOps, ML
- **Product & Design** - PM, UX/UI, Product Designer
- **Data & Analytics** - Data Scientist, Analyst, Business Analyst
- **Leadership** - Engineering Manager, Tech Lead, VP Engineering
- **Other Technical** - QA, Security, Systems Admin

### 📈 **ATS Scoring System**

**Weighted Analysis:**
- Keyword Density (30%)
- Quantification Check (25%)
- Impact Clarity (20%)
- Formatting Compliance (15%)
- Role Alignment (10%)

**Score Interpretation:**
- 90-100: Exceptional (99% ATS pass rate)
- 80-89: Strong (likely to pass)
- 70-79: Moderate (50% pass rate)
- 60-69: Weak (unlikely to pass)
- Below 60: Critical (will be rejected)

---

## 🎨 User Interface

### Design Principles

- **Dark Mode First** - Easy on the eyes, professional appearance
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Progress Indicators** - Visual feedback for long operations
- **Compact Cards** - Maximum information, minimum space
- **Color-Coded Status** - Quick visual understanding

### Layout Structure

```
┌─────────────────────────────────────┐
│      File Upload Zone (Top)        │
└─────────────────────────────────────┘
┌──────────────┬──────────────────────┐
│   Memory     │  GitHub Profile      │
│   (Left)     │  (Right)             │
└──────────────┴──────────────────────┘
┌─────────────────────────────────────┐
│   Resumes (Compact Grid)            │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│   GitHub Projects (3-Column)        │
└─────────────────────────────────────┘
```

---

## 🔐 Security & Privacy

- **Secure Authentication** - Firebase Auth with OAuth 2.0
- **Data Encryption** - All data encrypted at rest and in transit
- **No Data Selling** - Your information is never shared
- **Local Storage** - Guest mode stores data locally
- **GitHub Permissions** - Read-only access to public repositories

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- Built with modern web technologies
- Designed for job seekers worldwide
- Inspired by the need for better resume tools
- Community-driven development

---

<div align="center">

### **Made with ❤️ for job seekers everywhere**

[Report Bug](https://github.com/yourusername/resumeai/issues) · [Request Feature](https://github.com/yourusername/resumeai/issues)

⭐ Star this repo if you find it helpful!

</div>
