import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/authroutes';
import jobRoutes from './routes/job'

const app = express();
app.use(express.json());
app.use(cors());

app.use("/auth", authRoutes);
app.use("/jobs", jobRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT);
