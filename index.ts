import app from "./src/app";
import { connectDB } from "./src/utils/db";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
