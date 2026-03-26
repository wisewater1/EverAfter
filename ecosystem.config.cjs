module.exports = {
    apps: [
        {
            name: "fastapi-backend",
            script: "venv/Scripts/python.exe",
            args: "-m uvicorn app.main:app --host 0.0.0.0 --port 8010 --workers 1",
            cwd: "./backend",
            interpreter: "none",
            env: {
                PYTHONUNBUFFERED: "1",
            },
            watch: false
        },
        {
            name: "health-connect-api",
            script: "npm.cmd",
            args: "run dev",
            cwd: "./health-api",
            interpreter: "none",
            watch: false,
            env: {
                NODE_ENV: "development",
                PORT: "4000"
            }
        },
        {
            name: "task-worker",
            script: "venv/Scripts/python.exe",
            args: "-m app.workers.task_worker",
            cwd: "./backend",
            interpreter: "none",
            env: {
                PYTHONUNBUFFERED: "1",
            },
            watch: false
        },
        {
            name: "root-node-server",
            script: "npm.cmd",
            args: "run dev:server",
            cwd: "./",
            interpreter: "none",
            watch: false,
            env: {
                NODE_ENV: "development",
                PORT: "3001"
            }
        },
        {
            name: "root-agent-scheduler",
            script: "npm.cmd",
            args: "run dev:worker",
            cwd: "./",
            interpreter: "none",
            watch: false,
            env: {
                NODE_ENV: "development"
            }
        },
        {
            name: "vite-frontend",
            script: "npm.cmd",
            args: "run dev",
            cwd: "./",
            interpreter: "none",
            watch: false,
            env: {
                NODE_ENV: "development"
            }
        }
    ]
};
