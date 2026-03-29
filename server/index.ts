import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', (_req, res) => {
  res.status(410).json({
    status: 'decommissioned',
    service: 'node-runtime',
    detail: 'The Node/Prisma launch path has been retired. Use the FastAPI backend under /api/v1.',
  });
});

app.use((_req, res) => {
  res.status(410).json({
    detail: 'The Node/Prisma server has been retired. Start the FastAPI backend instead.',
  });
});

app.listen(PORT, () => {
  console.log(`Node runtime disabled on port ${PORT}. Use the FastAPI backend instead.`);
});

export default app;
