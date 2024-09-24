const app = require('./app');
const port = process.env.PORT || 3000;
const routes = require("./routes");

const app = express();

app.use(
  cors({
    origin: "*", // 或者指定允許的源
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(bodyParser.json());

// 資料庫連線設定
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;

db.once("once", () => {
  console.log("mongodb is connected!");
});

db.on("error", (err) => {
  console.log(err);
});

// 路由設定
app.use(routes);

// 伺服器監聽
app.listen(port, () => {
  console.log(`Express is running`);
});
