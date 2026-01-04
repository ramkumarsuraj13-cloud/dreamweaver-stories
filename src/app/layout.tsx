import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreamweaver Stories | Magical Bedtime Tales",
  description: "Generate personalized, magical bedtime stories with AI-crafted illustrations for your little ones.",
  keywords: ["bedtime stories", "children's stories", "AI stories", "personalized stories"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Stars />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}

// Animated stars background component
function Stars() {
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() * 3 + 1,
  }));

  return (
    <div className="stars-bg">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            animationDelay: star.delay,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
        />
      ))}
    </div>
  );
}
