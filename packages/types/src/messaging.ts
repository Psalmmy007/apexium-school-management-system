export interface MessageThread {
  id: string;
  schoolId: string;
  studentId?: string | null;
  parentId?: string | null;
  teacherId: string;
  subject: string;
  status: "open" | "closed";
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  schoolId: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface CreateThreadInput {
  schoolId: string;
  studentId?: string;
  parentId?: string;
  teacherId: string;
  subject: string;
  initialMessage: string;
}

export interface SendMessageInput {
  schoolId: string;
  threadId: string;
  senderId: string;
  content: string;
}
