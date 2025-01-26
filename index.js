const { Worker } = require("bullmq");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

function generateHeatmapPattern(name, startDate, repoDir) {
  const patterns = {
    A: "xxxxxxxxooxoooxooxoooxxxxxxxooooooo",
    S: "xxxxoxxxooxooxxooxooxxooxxxxooooooo",
    P: "xxxxxxxxooxoooxooxoooxxxxoooooooooo",
    I: "xoooooxxxxxxxxxxxxxxxxoooooxooooooo",
    R: "xxxxxxxxooxoooxooxxooxxxooxxooooooo",
    E: "xxxxxxxxooxooxxooxooxxooxooxooooooo",
    V: "xxxxxooooooxxoooooxxoxxxxxooooooooo",
  };

  const patternString = name
    .split("")
    .map((char) => patterns[char.toUpperCase()] || "")
    .join("");
  const patternLength = patternString.length;

  const currentDate = new Date(startDate);
  const commitFile = path.join("./", "newlol.txt");
  execSync(`touch newlol.txt`);

  for (let i = 0; i < patternLength; i++) {
    const char = patternString[i];
    if (char === "x") {
      const commitDate = currentDate.toISOString();
      for (let day = 0; day < 1; day++) {
        console.log("Bug Before");
        fs.appendFileSync(commitFile, `${commitDate} Day ${day}\n`);
        console.log("Bug After");

        const command = `git add . && GIT_AUTHOR_DATE="${commitDate}" GIT_COMMITTER_DATE="${commitDate}" git commit -m "Day ${day}, Commit ${commitDate}"`;

        execSync(command, { stdio: "inherit" });
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

const connection = {
  host: "roundhouse.proxy.rlwy.net",
  port: 35230,
  password: "HwRdLDPptlShKlrIzTLfHJdLjaoUqLnZ",
  tls: {}, // Secure connection for rediss://
  username: "default",
};

// Worker to process queue tasks
const worker = new Worker(
  "gitQueue",
  async (job) => {
    const { name, email, text, access_token } = job.data;
    console.log(`Processing job for ${name} <${email}> : <${text}>`);
    return {}

    const uniqueId = uuidv4();
    const startDate = "2024-01-07";
    const repoDir = "generated-1";

    try {
      if (fs.existsSync(repoDir)) {
        console.log(`Cleaning up existing repository: ${repoDir}`);
        fs.rmSync(repoDir, { recursive: true, force: true });
        console.log(`Successfully deleted: ${repoDir}`);
      }

      fs.mkdirSync(repoDir);
      process.chdir(repoDir);
      execSync(`git config --global user.email "${email}"`);
      execSync(`git config --global user.name "${name}"`);
      execSync(`git init`);

      generateHeatmapPattern(text, startDate, repoDir);

      //   const repoName = `generated-1`;
      const remoteUrl = `https://${access_token}@github.com/${name}/${repoDir}.git`;

      // Push to GitHub
      execSync(`cd ${repoDir} && git remote add origin ${remoteUrl}`);
      execSync(`cd ${repoDir} && git branch -M main`);
      execSync(`cd ${repoDir} && git push -u origin main`);

      console.log(`Repository pushed to GitHub: ${remoteUrl}`);
      return { repoName, remoteUrl };
    } catch (error) {
      console.error("Error processing job:", error);
      throw error;
    } finally {
      // Clean up repository directory
      try {
        fs.rmSync(repoDir, { recursive: true, force: true });
        console.log(`Deleted local repository directory: ${repoDir}`);
      } catch (cleanupError) {
        console.error(
          `Error deleting repository directory: ${cleanupError.message}`
        );
      }
    }
  },
  { connection: Redis.REDIS_URL }
);

worker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});

console.log("Queue worker is running...");
