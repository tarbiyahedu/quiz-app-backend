const cron = require('node-cron');
const LiveQuiz = require('../models/liveQuiz.model');

class QuizScheduler {
  constructor() {
    this.jobs = new Map();
    // Remove or comment out the following line:
    // this.initializeScheduler();
  }

  // Initialize scheduler and load existing scheduled quizzes
  async initializeScheduler() {
    try {
      console.log('Initializing quiz scheduler...');
      
      // Load all scheduled quizzes from database
      const scheduledQuizzes = await LiveQuiz.find({ 
        status: 'scheduled',
        liveStartAt: { $gt: new Date() }
      });

      scheduledQuizzes.forEach(quiz => {
        this.scheduleQuiz(quiz);
      });

      console.log(`Loaded ${scheduledQuizzes.length} scheduled quizzes`);
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  }

  // Schedule a quiz to start and end automatically
  scheduleQuiz(quiz) {
    const quizId = quiz._id.toString();
    
    // Cancel existing jobs for this quiz
    this.cancelQuizJobs(quizId);

    const startTime = new Date(quiz.liveStartAt);
    const endTime = new Date(quiz.liveEndAt);
    const now = new Date();

    // Only schedule if start time is in the future
    if (startTime <= now) {
      console.log(`Quiz ${quizId} start time has passed, skipping schedule`);
      return;
    }

    // Schedule start job
    const startCronExpression = this.dateToCron(startTime);
    const startJob = cron.schedule(startCronExpression, async () => {
      await this.startQuiz(quizId);
    }, {
      scheduled: false
    });

    // Schedule end job
    const endCronExpression = this.dateToCron(endTime);
    const endJob = cron.schedule(endCronExpression, async () => {
      await this.endQuiz(quizId);
    }, {
      scheduled: false
    });

    // Store jobs
    this.jobs.set(quizId, { startJob, endJob });

    // Start the jobs
    startJob.start();
    endJob.start();

    console.log(`Scheduled quiz ${quizId} to start at ${startTime} and end at ${endTime}`);
  }

  // Cancel scheduled jobs for a quiz
  cancelQuizJobs(quizId) {
    const existingJobs = this.jobs.get(quizId);
    if (existingJobs) {
      existingJobs.startJob.stop();
      existingJobs.endJob.stop();
      this.jobs.delete(quizId);
      console.log(`Cancelled scheduled jobs for quiz ${quizId}`);
    }
  }

  // Convert date to cron expression
  dateToCron(date) {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const dayOfWeek = date.getDay(); // 0 = Sunday

    return `${minutes} ${hours} ${day} ${month} ${dayOfWeek}`;
  }

  // Start a quiz automatically
  async startQuiz(quizId) {
    try {
      const quiz = await LiveQuiz.findById(quizId);
      if (!quiz || quiz.status !== 'scheduled') {
        console.log(`Quiz ${quizId} not found or not scheduled`);
        return;
      }

      const now = new Date();
      quiz.status = 'live';
      quiz.isLive = true;
      quiz.startTime = now;
      quiz.endTime = null;
      
      // Add to live history
      quiz.liveHistory.push({
        startedAt: now,
        endedAt: null,
        duration: 0
      });

      await quiz.save();
      console.log(`Quiz ${quizId} started automatically at ${now}`);
    } catch (error) {
      console.error(`Error starting quiz ${quizId}:`, error);
    }
  }

  // End a quiz automatically
  async endQuiz(quizId) {
    try {
      const quiz = await LiveQuiz.findById(quizId);
      if (!quiz || !quiz.isLive) {
        console.log(`Quiz ${quizId} not found or not live`);
        return;
      }

      const now = new Date();
      quiz.status = 'completed';
      quiz.isLive = false;
      quiz.endTime = now;
      
      // Update the last live history entry
      if (quiz.liveHistory.length > 0) {
        const lastSession = quiz.liveHistory[quiz.liveHistory.length - 1];
        lastSession.endedAt = now;
        lastSession.duration = Math.round((now - lastSession.startedAt) / (1000 * 60)); // Duration in minutes
      }

      await quiz.save();
      console.log(`Quiz ${quizId} ended automatically at ${now}`);
    } catch (error) {
      console.error(`Error ending quiz ${quizId}:`, error);
    }
  }

  // Get all scheduled jobs
  getScheduledJobs() {
    return Array.from(this.jobs.keys());
  }

  // Clean up scheduler
  cleanup() {
    this.jobs.forEach((jobs, quizId) => {
      jobs.startJob.stop();
      jobs.endJob.stop();
    });
    this.jobs.clear();
  }
}

// Create singleton instance
const quizScheduler = new QuizScheduler();

module.exports = quizScheduler; 