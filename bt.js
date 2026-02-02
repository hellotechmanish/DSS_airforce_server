// This should work in modern browsers
const topicText = '{"RES_0":05,"alarm":0,"start":1}';
const base64Topic = btoa(topicText);
console.log(base64Topic); // b25saW5lcmVzbW9uaXRvcg==