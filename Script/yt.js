/**

 *
 */

try{
var obj = JSON.parse($response.body);
var pay={"task_render_720":9999999,"task_render_1080":9999999,"task_water_mark":9999999,"free_limit_num":9999999};

if($request.url.includes('user/vip-info')==true){

obj.data.is_vip=true;
obj.data.down_limit_num=9999999;
obj.data.vip_expired_at=7956840672;
obj.data.mv_coin=9999999;
obj.data.material_limit_num=9999999;
obj.data.video_limit_num=9999999;
obj.data.task_limit_num=9999999;
}
else if($request.url.includes('user/info')==true){
obj.data.has_show_tutorials=9999999;
obj.data.collect_num=9999999;
obj.data.nickname="这里是昵称";
obj.data.task_num=9999999;
}
else if($request.url.includes('pay-info')==true){
obj.data.pay_info=pay;
obj.data.down_info["1080"]=1;
obj.data.down_info["720"]=1;
}
else if($request.url.includes('preview')==true){
obj.data.pay_info=pay;
$prefs.setValueForKey(obj.data.theme_info.video,"url");
}
else if($request.url.includes('download')==true){
obj.data={"video":$prefs.valueForKey("url")};
$notify("什么鬼", "什么东西");
}
$done({ body: JSON.stringify(obj) });
}
catch(e){
console.log($prefs.valueForKey("url").toString());
$done($prefs.valueForKey("url").toString());
}

