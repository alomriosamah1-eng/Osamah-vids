import fs from 'fs';
import path from 'path';
import { VideoJob } from './types.ts';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const VIDEOS_DIR = path.join(STORAGE_DIR, 'videos');
const JOBS_FILE = path.join(STORAGE_DIR, 'jobs.json');

// Ensure directories exist
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

export class StorageManager {
  private static loadJobs(): Map<string, VideoJob> {
    try {
      if (fs.existsSync(JOBS_FILE)) {
        const raw = fs.readFileSync(JOBS_FILE, 'utf-8');
        const data: VideoJob[] = JSON.parse(raw);
        return new Map(data.map(job => [job.id, job]));
      }
    } catch (e) {
      console.error('[StorageManager] Error reading jobs.json:', e);
    }
    return new Map();
  }

  private static persistJobs(jobs: Map<string, VideoJob>): void {
    try {
      const arr = Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
      fs.writeFileSync(JOBS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (e) {
      console.error('[StorageManager] Error saving jobs.json:', e);
    }
  }

  public static getJob(id: string): VideoJob | undefined {
    const jobs = this.loadJobs();
    return jobs.get(id);
  }

  public static getAllJobs(): VideoJob[] {
    const jobs = this.loadJobs();
    return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public static saveJob(job: VideoJob): void {
    const jobs = this.loadJobs();
    jobs.set(job.id, job);
    this.persistJobs(jobs);
  }

  public static deleteJob(id: string): boolean {
    const jobs = this.loadJobs();
    const job = jobs.get(id);
    if (!job) return false;

    // Delete associated files if local
    if (job.videoUrl && job.videoUrl.startsWith('/storage/videos/')) {
      const videoFilename = path.basename(job.videoUrl);
      const videoPath = path.join(VIDEOS_DIR, videoFilename);
      if (fs.existsSync(videoPath)) {
        try { fs.unlinkSync(videoPath); } catch (_) {}
      }
    }

    if (job.thumbnailUrl && job.thumbnailUrl.startsWith('/storage/videos/')) {
      const thumbFilename = path.basename(job.thumbnailUrl);
      const thumbPath = path.join(VIDEOS_DIR, thumbFilename);
      if (fs.existsSync(thumbPath)) {
        try { fs.unlinkSync(thumbPath); } catch (_) {}
      }
    }

    jobs.delete(id);
    this.persistJobs(jobs);
    return true;
  }

  public static getVideosDirectory(): string {
    return VIDEOS_DIR;
  }
}
