const express = require('express')
const app = express();


const { MongoClient, ObjectId } = require("mongodb");

//methodOverride라이브러리를 사용하기 위한 코드 작성
const methodOverride = require('method-override')


// 비밀번호 해싱 bcrypt
const bcrypt = require('bcrypt');


// Jwt을 발급하기 위한 코드 작성
const jwt = require('jsonwebtoken')


// 로그인 한 세션을 DB에 저장하기 위한 라이브러리
const MongoStore = require('connect-mongo')

// 환경변수를 다른파일에 보관하기 위한 코드
require('dotenv').config()



// MongoDB를 서버와 연결하기 위한 코드
let db;
const url = process.env.DB_URL;
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("Shop");
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

//메소드오버라이드 원래 form 태그안에 method는 get, post만 사용할 수 있지만
//메소드 오버라이드 라이브러리를 사용하면 form태그 method에 put delete를 사용할 수 있다.
app.use(methodOverride('_method'));

// server.js에서 .css .js .jpg를 사용하기 위한 코드 
app.use(express.static(__dirname + "/public"));



// 아이디비밀번호 검증 미들웨어 설정
function idPasswordCheck (요청,응답,next)  {
    if(요청.body.userid == '' || 요청.body.password == ''){
        응답.send('아이디 혹은 비밀번호가 공백입니다. ')
    }else if(요청.body.password.length < 6){
        응답.send('비밀번호는 6글자 이상으로 해주세요.!');
    }else{
        next();
    }
}




// 클라이언트에서 "/"를 요청시 main.ejs를 랜더링 해줌
app.get('/', (요청,응답) =>{
    응답.render('main.ejs');
})


// 클라이언트에서 /register를 요청시 register.ejs를 랜더링 해줌
app.get('/register',  (요청,응답) => {
    응답.render('register.ejs');
})



// idPasswordCheck 미들웨어를 넣어줘서 아이디 혹은 비밀번호 공백 확인 
app.post('/register', idPasswordCheck, async (요청,응답) => {
    let result = await db.collection('User').findOne({ userId : 요청.body.userId })
    let 해싱 = await bcrypt.hash(요청.body.password, 10)
    try{
        if(result){
            응답.send('아이디가 이미 있습니다. 다른 아이디를 사용하세요.')
        }else {
            await db.collection('User').insertOne({userId : 요청.body.userId, password : 해싱, email : 요청.body.email, name : 요청.body.userName, address : 요청.body.address, phoneNum : 요청.body.phoneNum })
            응답.render('main.ejs')
        }
        

    } catch(e) {
        console.log('회원가입 오류~')
    }
    
})


//게시글 작성 

app.get('/write', (요청,응답) => {
    응답.render('write.ejs')
})


app.post('/add', upload.single("img"), async(요청,응답) => {
    console.log(요청.file)
    try{
        if(요청.body.title == '' || 요청.body.content == ''){
            응답.send('공백은 안됩니다. ')
        }else{
            await db.collection('post').insertOne({title: 요청.body.title, content: 요청.body.content, img: 요청.file.location })
            응답.redirect('/list')
        }
    } catch(e){
        console.log(e)
    }
    
})



//게시글 리스트

app.get('/list', async(요청,응답) => {
    try{
        let result = await db.collection('post').find().toArray()
        응답.render('list.ejs', { post:result })
    }catch(e){
        console.log(e)
    }
})


// 게시글 상세페이지
//detail/요청한 url파라미터 id값 /detail/:id에 맞는 detail  랜더링
app.get('/detail/:id', async (요청,응답) => {
    try{
        let result = await db.collection('post').findOne({_id: new ObjectId(요청.params.id)})
        응답.render('detail.ejs', { detail : result});
    } catch(e) {
        console.log(e);
    }
})


//게시글 수정기능 만들기

app.get('/post/:id', async(요청,응답) => {
    try{
        let result = await db.collection('post').findOne({_id: new ObjectId(요청.params.id)})
    응답.render('edit.ejs', { edit : result })
    }catch(e){
        console.log(e)
    }
})

//수정

app.put('/edit', async(요청,응답) => {
    try{
        await db.collection('post').updateOne({_id : new ObjectId(요청.body.id)}, {$set : {title: 요청.body.title, content: 요청.body.content}})
        응답.redirect('/list')
    }catch(e){
        응답.status(500).send("서버에러");
    }
})


// 삭제기능 

app.delete('/:id', async (요청,응답) => {  
          await db.collection('post').deleteOne({_id:new ObjectId(요청.query.docid)})
            응답.redirect('/list')
})


//로그인 기능 jwt 사용해서 만들기 !! 공부


// 클라이언트가 "/login" 요청시 login.ejs 랜더링해주기
app.get('/login', (요청,응답) => {
    응답.render('login.ejs')
})


// jwt JsonWebToken을 사용해서 클라이언트가 로그인 요청시 서버에서 토큰을 발급해서 사용자인증을 한 후 
// 클라이언트에게 토큰을 같이 응답해줌.

app.post("/login", async (요청, 응답) => {
    try {
      // MongoDB에서 사용자 찾기
      let user = await db.collection("User").findOne({ userId: 요청.body.userId });
      console.log("DB User:", user);
  
      // 사용자 검증
      if (!user || !(await bcrypt.compare(요청.body.password, user.password))) {
        return 응답.status(404).json({ message: "아이디 혹은 비밀번호가 다릅니다." });
      }
  
      // JWT 발급
      const token = jwt.sign({ userId: user.userId, id: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
      });
      console.log(token)
      응답.redirect('/');
    } catch (e) {
      console.error(e);
      return 응답.status(500).json({ message: "서버 오류..." });
    }
  });



// token 인증 미들웨어

function checkedToken (요청,응답,next) {
    const token = 요청.header["authorization"]?.split("")[1];

    if(!token){
        return 응답.status(403).json({ message: '토큰'});
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        요청.user = decoded;
        next()
    } catch(e){
        return 응답.status(401).json({message : '토큰검증'})

    }

}







