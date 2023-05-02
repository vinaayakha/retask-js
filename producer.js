import Queue, { Task } from "./retask.js";


//  redis://default:Dn7FqjiGo9T0PlYvFlPQ7XBRBE1M92UJ@redis-10825.c277.us-east-1-3.ec2.cloud.redislabs.com:10825
const queue = new Queue("example", {
  host: "redis-10825.c277.us-east-1-3.ec2.cloud.redislabs.com",
  port: 10825,
  db: 0,
  password: "Dn7FqjiGo9T0PlYvFlPQ7XBRBE1M92UJ",
  user: "default"
});
function main() {
  //   console.log({queue});
  let info1 = { user: "kushal", url: "http://kushaldas.in" };
  let info2 = {
    user: "fedora planet",
    url: "http://planet.fedoraproject.org",
    key: "value1",
  };
  let task1 = new Task(info1);
  let task2 = new Task(info2);
  queue.connect();
  queue.enqueue(task1);
  queue.enqueue(task2);

  //   console.log(queue);

  console.log(queue.dequeue());
  
//   process.exit.code(1);
}

main();
