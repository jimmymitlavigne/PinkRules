/*

QX:

[rewrite_local]👇

https:\/\/bookapi\.ihuman\.com\/(v1\/get\_user\_info|v1\/get\_purchase\_list) url script-response-body hnsyhb.js


MITM = bookapi.ihuman.com



const path1 = "/v1/get_purchase_list";
const path2 = "/v1/get_user_info";

let key = {"expire_time":7955110875,"vip_type":YEAD,"last_product_id":"com.ihuman.book.sub.vip1y"};

let obj = JSON.parse($response.body);

if ($request.url.indexOf(path1) != -1){
	obj.result["vip_status"] = key;	
}
if ($request.url.indexOf(path2) != -1){
	obj.result.userinfo["vip_status"] = key;
	
}


$done({body: JSON.stringify(obj)});

*/
const path = ""/v3/get_book_info";
let key = {"is_vip": 0"};
let obj = JSON.parse($response.body);

if ($request.url.indexOf(path1) != -1){
	obj.result["is_vip\"\\s*:\\s*\\d"] = key;	
}

$done({body: JSON.stringify(obj)});

