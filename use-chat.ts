import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ChatInput } from "@shared/routes";
import { type Chat } from "@shared/schema";

export function useChatHistory(sessionId: string) {
  return useQuery({
    queryKey: [api.chat.history.path, sessionId],
    queryFn: async () => {
      const url = buildUrl(api.chat.history.path, { sessionId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return []; // Return empty array for new sessions
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.chat.history.responses[200].parse(await res.json());
    },
    enabled: !!sessionId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ChatInput) => {
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        // Try to parse error response
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to send message");
        } catch {
          throw new Error("Failed to send message");
        }
      }
      
      return api.chat.send.responses[200].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific session's history
      queryClient.invalidateQueries({ 
        queryKey: [api.chat.history.path, variables.sessionId] 
      });
    },
  });
}
