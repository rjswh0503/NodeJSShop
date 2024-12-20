const express = require('express')
const app = express();


const { MongoClient, ObjectId } = require("mongodb");

//methodOverride라이브러리를 사용하기 위한 코드 작성
const methodOverride = require('method-override')


// 비밀번호 해싱 bcrypt
const bcrypt = require('bcrypt');


// 로그인 한 세션을 DB에 저장하기 위한 라이브러리
const MongoStore = require('connect-mongo')

// 환경변수를 다른파일에 보관하기 위한 코드
require('dotenv').config()



//
let db;
const url = process.env.DB_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("Shop");
    app.listen(process.env.PORT, () => {
      console.log(`포트번호: ${process.env.PORT}에서 실행중...`);
    });
  })
  .catch((err) => {
    console.log(err);
  });


  // 이미지 업로드를 위한 코드 작성
  const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET,
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'jaeshinforum1',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})


// html 파일에 데이터를 넣고 싶으면 .ejs 파일로 만들면 가능.
app.set("view engine", "ejs");
// 요청.body 사용할려면 필수
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));

// server.js에서 .css .js .jpg를 사용하기 위한 코드 
app.use(express.static(__dirname + "/public"));





app.get('/', (요청,응답) =>{
    응답.render('main.ejs');
})

app.get('/register', (요청,응답) => {
    응답.render('register.ejs');
})