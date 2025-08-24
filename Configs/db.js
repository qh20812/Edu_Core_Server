const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try{
        const conn_str=process.env.MONGO_URI;
        await mongoose.connect(conn_str,{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Kết nối MongoDB thành công! ✅');
    }catch(error){
        console.error('Kết nối MongoDB thất bại! ❌');
        console.error(error);
        process.exit(1);
    }
}
module.exports = connectDB;