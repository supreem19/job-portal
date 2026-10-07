import app from "./app";
import { connectDB } from "./utils/db";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
