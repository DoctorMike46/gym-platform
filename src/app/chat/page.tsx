import { requireAuth } from "@/lib/auth";
import { listChatConversations } from "@/lib/actions/chat";
import ChatContent from "./chat-content";

export default async function ChatPage() {
    await requireAuth();
    const conversations = await listChatConversations();
    return <ChatContent conversations={conversations} />;
}
