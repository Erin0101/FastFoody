var express = require('express')
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session')

var app = express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"secret", resave:false, saveUninitialized:true}))

const sampleProducts = [
   {id:1,name:'Margherita Pizza',description:'Classic cheese pizza topped with fresh basil and tomato sauce.',price:20,sale_price:16,image:'f1.png',category:'pizza'},
   {id:2,name:'Classic Burger',description:'Juicy beef burger with crisp lettuce, tomato, and signature sauce.',price:15,sale_price:13,image:'f2.png',category:'burger'},
   {id:3,name:'Pepperoni Pizza',description:'Flavorful pizza topped with spicy pepperoni and extra cheese.',price:17,sale_price:0,image:'f3.png',category:'pizza'},
   {id:4,name:'Creamy Pasta',description:'Creamy pasta served with rich sauce, parmesan cheese, and herbs.',price:18,sale_price:0,image:'f4.png',category:'pasta'},
   {id:5,name:'Crispy Fries',description:'Golden fries seasoned to perfection and served hot.',price:10,sale_price:0,image:'f5.png',category:'fries'},
   {id:6,name:'Veggie Pizza',description:'Fresh vegetable pizza with bell peppers, onions, and olives.',price:15,sale_price:0,image:'f6.png',category:'pizza'},
   {id:7,name:'Cheese Burger',description:'Classic burger with melted cheese, lettuce, tomato, and pickles.',price:12,sale_price:0,image:'f7.png',category:'burger'},
   {id:8,name:'Double Burger',description:'Double beef patties with cheese, onions, and special sauce.',price:14,sale_price:0,image:'f8.png',category:'burger'},
   {id:9,name:'Tomato Basil Pasta',description:'Light pasta with tomato basil sauce and fresh parmesan.',price:10,sale_price:0,image:'f9.png',category:'pasta'}
];

function getProducts(result){
   return (result && result.length) ? result : sampleProducts;
}

function findProductById(products, id){
   const list = Array.isArray(products) ? products : [];
   return list.find((item)=> String(item.id) === String(id));
}


function isProductInCart(cart,id){
   
   for(let i=0; i<cart.length; i++){
      if(cart[i].id == id){
         return true;
      }
   }

   return false;

}


function calculateTotal(cart,req){
   let total = 0;
   for(let i=0; i<cart.length; i++){
      if(cart[i].sale_price){
         total = total + (cart[i].sale_price*cart[i].quantity);
      }else{
         total = total + (cart[i].price*cart[i].quantity)
      }
   }
   req.session.total = total;
   return total;

}




// localhost:8080
app.get('/',function(req,res){

   
   var con = mysql.createConnection({
         host:"localhost",
         user:"root",
         password:"",
         database:"node_project"
      })

      con.query("SELECT * FROM products",(err,result)=>{
         if(err){
            console.log(err);
            return res.render('pages/index',{result:sampleProducts});
         }
         var products = getProducts(result);
         res.render('pages/index',{result:products});
      })

});




app.post('/add_to_cart',function(req,res){

   var id = req.body.id;
   var name = req.body.name;
   var price = req.body.price;
   var sale_price = req.body.sale_price;
   var quantity = req.body.quantity;
   var image = req.body.image;
   var product = {id:id,name:name,price:price,sale_price:sale_price,quantity:quantity,image:image};


   if(req.session.cart){
         var cart = req.session.cart;

         if(!isProductInCart(cart,id)){
            cart.push(product);
         }
   }else{

      req.session.cart = [product]
      var cart = req.session.cart;

   }


   //calculate total
   calculateTotal(cart,req);

   //return to cart page
   res.redirect('/cart');

});




app.get('/cart',function(req,res){

   var cart = req.session.cart || [];
   var total = req.session.total || 0;

   res.render('pages/cart',{cart:cart,total:total});


});



app.post('/remove_product',function(req,res){

   var id = req.body.id;
   var cart = req.session.cart || [];

   for(let i=0; i<cart.length; i++){
      if(cart[i].id == id){
         cart.splice(i,1);
         break;
      }
   }

   calculateTotal(cart,req);
   res.redirect('/cart');

});

app.post('/edit_product_quantity',function(req,res){

   var id = req.body.id;
   var increase_btn = req.body.increase_product_quantity;
   var decrease_btn = req.body.decrease_product_quantity;

   var cart = req.session.cart || [];

   if(increase_btn){
      for(let i=0; i<cart.length; i++){
         if(cart[i].id == id){
            cart[i].quantity = parseInt(cart[i].quantity) + 1;
         }
      }
   }

   if(decrease_btn){
      for(let i=0; i<cart.length; i++){
         if(cart[i].id == id){
            if(parseInt(cart[i].quantity) > 1){
               cart[i].quantity = parseInt(cart[i].quantity) - 1;
            }
         }
      }
   }

   calculateTotal(cart,req);
   res.redirect('/cart');

})









app.get('/checkout',function(req,res){
   var total = req.session.total
   res.render('pages/checkout',{total:total})
})

app.post('/place_order',function(req,res){

   var name = req.body.name;
   var email = req.body.email;
   var phone = req.body.phone;
   var city = req.body.city;
   var address = req.body.address;
   var cost = req.session.total;
   var status = "not paid";
   var date = new Date();
   var products_ids="";
   var id = Date.now();
   req.session.order_id = id;
   

   var con = mysql.createConnection({
      host:"localhost",
      user:"root",
      password:"",
      database:"node_project"
   })

   var cart = req.session.cart;
   for(let i=0; i<cart.length; i++){
      products_ids = products_ids + "," +cart[i].id;
   }

  

   con.connect((err)=>{
      if(err){
         console.log(err);
      }else{
         var query = "INSERT INTO orders (id,cost,name,email,status,city,address,phone,date,products_ids) VALUES ?";
         var values = [
            [id,cost,name,email,status,city,address,phone,date,products_ids]
         ];
         
         con.query(query,[values],(err,result)=>{

            for(let i=0;i<cart.length;i++){
               var query = "INSERT INTO order_items (order_id,product_id,product_name,product_price,product_image,product_quantity,order_date) VALUES ?";
               var values = [
                  [id,cart[i].id,cart[i].name,cart[i].price,cart[i].image,cart[i].quantity,new Date()]
               ];
               con.query(query,[values],(err,result)=>{})
            }


            res.redirect('/payment')
               
         
          
            
         })
      }
   })
   
    
})




app.get('/payment',function(req,res){
   var total = req.session.total
   res.render('pages/payment',{total:total})
})



app.get("/verify_payment",function(req,res){
   var transaction_id = req.query.transaction_id;
   var order_id = req.session.order_id;

   var con =  mysql.createConnection({
      host:"localhost",
      user:"root",
      password:"",
      database:"node_project"
   })
   

   con.connect((err)=>{
            if(err){
               console.log(err);
            }else{
               var query = "INSERT INTO payments (order_id,transaction_id,date) VALUES ?";
               var values = [
                  [order_id,transaction_id,new Date()]
               ]
               con.query(query,[values],(err,result)=>{
                  
                  con.query("UPDATE orders SET status='paid' WHERE id='"+order_id+"'",(err,result)=>{})
                  res.redirect('/thank_you')
               
               })
            }  
      })   
   
})


app.get("/thank_you",function(req,res){

   var order_id = req.session.order_id;
   res.render("pages/thank_you",{order_id:order_id})
})


app.get('/single_product',function(req,res){

   var id = req.query.id;

   var con = mysql.createConnection({
      host:"localhost",
      user:"root",
      password:"",
      database:"node_project"
   })

   con.query("SELECT * FROM products WHERE id='"+id+"'",(err,result)=>{
      if(err){
         console.log(err);
         result = [];
      }
      var item = findProductById(result, id);
      if(!item){
         item = findProductById(sampleProducts, id);
      }
      res.render('pages/single_product',{result:item ? [item] : []});
   })

});


app.get('/products',function(req,res){

   var con = mysql.createConnection({
      host:"localhost",
      user:"root",
      password:"",
      database:"node_project"
   })

   con.query("SELECT * FROM products",(err,result)=>{
      if(err){
         console.log(err);
         return res.render('pages/products',{result:sampleProducts});
      }
      var products = getProducts(result);
      res.render('pages/products',{result:products});
   })

});

app.get('/about',function(req,res){
   
   res.render('pages/about');
});

app.listen(8080, function(){
   console.log('Server running on http://localhost:8080');
});