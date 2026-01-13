# 🌙 Dreamweaver Stories

A magical bedtime story generator that creates personalized tales with AI-crafted illustrations for children of all ages.

![Dreamweaver Stories](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)

## ✨ Features

- **Personalized Stories**: Add your child's name for a custom adventure
- **Age-Appropriate Content**: Stories tailored for babies through early readers
- **Multiple Themes**: Adventure, Animals, Fantasy, Space, Friendship, Silly, Nature, Ocean
- **Adjustable Length**: Quick (2 min), Medium (5 min), or Long (10 min) stories
- **Tone Control**: Soothing for sleepy time, or Exciting for more energy
- **Rhyming Option**: Turn stories into delightful poems
- **AI Illustrations**: Beautiful, unique images for each story

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Together AI API key ([get one here](https://api.together.xyz/settings/api-keys))

### Installation

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your API keys:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   TOGETHER_API_KEY=sk-together-...
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 🌐 Deploy to Vercel

The easiest way to deploy:

1. Push your code to GitHub

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Add your environment variables in the Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `TOGETHER_API_KEY`

4. Deploy! 🎉

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## 📱 Future: iOS App

This web app is designed to work beautifully on mobile browsers. For a native iOS experience, you can:

1. **PWA (Progressive Web App)**: Add to home screen for app-like experience
2. **Capacitor/Ionic**: Wrap this Next.js app in a native shell
3. **React Native**: Port the UI components to React Native

## 🎨 Customization

### Themes

Add new themes in `src/app/page.tsx`:
```typescript
{ value: "dinosaurs", label: "Dinosaurs", emoji: "🦕" }
```

And in `src/app/api/generate-story/route.ts`:
```typescript
dinosaurs: "a prehistoric adventure with friendly dinosaurs"
```

### Styling

The app uses a magical night-sky theme. Customize colors in `tailwind.config.ts` and `globals.css`.

## 💡 How It Works

1. **User selects options** → Name, age, length, theme, tone, rhyming
2. **Claude generates story** → Age-appropriate, themed bedtime tale
3. **Together AI creates illustration** → Whimsical children's book art
4. **Beautiful display** → Story-book style presentation

## 📄 API Routes

- `POST /api/generate-story` - Generates story text using Claude
- `POST /api/generate-image` - Creates illustration using Together AI

## 🔒 Privacy

- No user data is stored
- Stories are generated on-demand
- No login required

## 📝 License

MIT License - feel free to use and modify!

---

Made with 💜 for bedtime magic
