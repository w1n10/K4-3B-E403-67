import { listTopics } from "@/lib/content";
import HomeClient from "./home-client";

// Đọc file content ở server, render ở client để dùng được i18n.
export default function Home() {
  return <HomeClient topics={listTopics()} />;
}
