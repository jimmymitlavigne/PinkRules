/*
[rewrite_local]
#西窗烛 （by黑黑酱）
^https:\/\/lchttpapi\.xczim\.com\/1\.1\/users\/ url script-response-body xcz.js

[MITM]
hostname:lchttpapi.xczim.com

*/

var body = $response.body; 
var obj = JSON.parse(body); 

obj.lifetimeMembership = true;
obj.membership = true;

body = JSON.stringify(obj); 
$done(body);
