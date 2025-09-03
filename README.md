# 🎾 Tennis Captain App

A comprehensive web application for tennis team captains to manage players, training sessions, match lineups, and team administration.

## 🌟 Features

### **Setup Page (Admin Hub)**
- 👥 **Player Management**: Add players and export roster data
- 📊 **Training Upload**: CSV import with intelligent player matching
- ⚙️ **Custom Views**: Configure training display preferences
- 🗄️ **Database Setup**: Cloud storage migration tools

### **Training Page (Streamlined Interface)**
- ➕ **Schedule Training**: Simple, focused training creation
- 📅 **Session Overview**: Next 3 upcoming training sessions
- 🚨 **Absence Tracking**: Visual indication of player availability
- 🎯 **Clean UI**: Removed clutter, focused on core functionality

### **Team Page (Player Roster)**
- 👤 **Player Roster**: Complete team member listing
- 📈 **Rankings**: Automatic ranking-based sorting
- 📱 **Responsive Design**: Works on all devices
- 🔗 **Admin Redirect**: Links to Setup page for management tasks

## 🚀 Quick Deploy to Vercel

### **Prerequisites**
- Node.js 18+ installed
- Git repository (GitHub/GitLab)
- Vercel account

### **1-Click Deploy**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Ftennis-captain-app)

### **Manual Deployment**
1. **Push to Git**: `git push origin main`
2. **Deploy to Vercel**: Import repository at [vercel.com](https://vercel.com)
3. **Add Database**: Create Postgres database in Vercel Storage
4. **Configure Environment**: Copy database variables to Vercel settings
5. **Redeploy**: Trigger redeployment with database configuration

📋 **Detailed guide**: See [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)

## 💾 Database Architecture

- **Database-First**: Vercel Postgres for production
- **Smart Fallback**: localStorage for development/offline
- **Auto-Migration**: Seamless transition from local to cloud storage
- **Schema Management**: Automatic table creation and updates

## 🛠 Local Development

### **Setup**
```bash
# Clone the repository
git clone <your-repo-url>
cd tennis-captain-app

# Install dependencies
npm install

# Copy environment template (optional - works with localStorage)
cp .env.local.template .env.local
# Add your Vercel Postgres credentials if available

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### **Development Mode**
- Works with localStorage by default (no database required)
- Automatic fallback to database when environment variables are set
- Hot reload with Next.js development server

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (database operations)
│   ├── setup/             # Admin hub page
│   ├── training/          # Training management
│   └── team/              # Player roster
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Database and utility functions
└── types/                 # TypeScript type definitions
```

## 🔧 Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components
- **Database**: Vercel Postgres with automatic fallback
- **Authentication**: JWT with localStorage/database storage
- **File Processing**: Excel/CSV upload with intelligent parsing
- **Deployment**: Vercel Platform (zero-config)

## 📖 Documentation

- 📋 [Deployment Guide](DEPLOYMENT-CHECKLIST.md) - Complete Vercel deployment walkthrough
- 🗄️ [Database Setup](README-DATABASE.md) - Vercel Postgres configuration
- 🔌 API documentation available in `/src/app/api/` route files

## 🎯 Version History

### **v1.3** (Latest - Production Ready)
- ✨ Centralized Setup page with all admin functions
- 🧹 Streamlined Training page interface
- 📊 Complete CSV upload with intelligent player matching
- 🔄 Cross-page settings synchronization
- 🚀 Ready for Vercel deployment with Postgres

### **v1.2**
- User-personalized dashboard and training page fixes
- Mobile-first UX optimization

### **v1.1** 
- Complete tennis captain app with shadcn/ui integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Ready to deploy?** Follow the [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) for a complete step-by-step guide to get your Tennis Captain App live on Vercel with cloud database storage!
