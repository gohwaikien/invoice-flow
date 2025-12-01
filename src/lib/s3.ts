// Re-export from storage.ts for backwards compatibility
export { 
  uploadFile as uploadToS3, 
  getFileUrl as getSignedFileUrl, 
  generateFileKey 
} from "./storage";
