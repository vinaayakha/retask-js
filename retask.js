/**
 * Retask Queue implementation
 */
import { createClient } from "redis";
import { v4 } from "uuid";
const CONNECTION_ERROR = "Queue is not connected";

export class Task {
  constructor(data) {
    this.data = data;
  }
}

export default class Queue {
  constructor(name, config) {
    this.name = name;
    this._name = `retaskqueue-${name}`;
    this.config = config
      ? config
      : {
          host: "localhost",
          port: 6379,
          db: 0,
          password: null,
        };
    this.connected = false;
  }

  names() {
    return new Promise((resolve, reject) => {
      this.rdb.keys("retaskqueue-*", (err, data) => {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(data.map((name) => name.slice(12)));
        }
      });
    });
  }

  get length() {
    return new Promise((resolve, reject) => {
      this.rdb.lLen(this._name, (err, length) => {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(length);
        }
      });
    });
    // return this.rdb.lLen.length
  }

  async connect() {
    console.log("connection started to redis");

    const config = this.config;
    this.rdb = createClient({
      url: `redis://${config.user}:${config.password}@${config.host}:${config.port}`,
    });
    const res = await this.rdb.connect();
    this.rdb.on("connect", () => {
        console.log("connected!!!!!!");
        this.connected = true;
        return true;
    });
    this.rdb.on("ready", () => {
        console.log("readt!!!!!!");
        this.connected = true;
    });
  }

  wait(waitTime = 0) {
    return new Promise((resolve) => {
      this.rdb.brPop(this._name, waitTime, (err, data) => {
        if (err || !data) {
          resolve(false);
        } else {
          const task = new Task();
          task.data = JSON.parse(data[1]);
          resolve(task);
        }
      });
    });
  }

  dequeue() {
    return new Promise((resolve) => {
      this.rdb.lPop(this._name, (err, data) => {
        if (err || !data) {
          resolve(null);
        } else {
            console.log(data);
          const task = new Task();
          task.data = JSON.parse(data);
          resolve(task);
        }
      });
    });
  }

  enqueue(task) {
    try {
      const job = new Job(this.rdb);
      task.urn = job.urn;
      const text = JSON.stringify(task);
      this.rdb.lPush(this._name, text);
    //   this.rdb.lLen(this._name);
      return job;
    } catch (err) {
      console.log({err});
      return false;
    }
  }
}

export class Job {
  /**
   * Job object containing the result from the workers.
   *
   * @param {RedisClient} rdb - The underlying redis connection.
   */
  constructor(rdb) {
    this.rdb = rdb;
    this.urn = v4();
    this.__result = null;
  }

  /**
   * Returns the result from the worker for this job. This is used to pass
   * result in async way.
   */
  get result() {
    if (this.__result) {
      return this.__result;
    }
    const data = this.rdb.rpop(this.urn);
    if (data) {
      this.rdb.del(this.urn);
      const result = JSON.parse(data);
      this.__result = result;
      return result;
    } else {
      return null;
    }
  }

  /**
   * Blocking call to check if the worker returns the result. One can use
   * job.result after this call returns `true`.
   *
   * @param {number} wait_time - Time in seconds to wait, default is infinite.
   * @returns {boolean} `true` if the result is available, `false` otherwise.
   *
   * @note This is a blocking call, you can specify wait_time argument for timeout.
   */
  async wait(wait_time = 0) {
    if (this.__result) {
      return true;
    }
    const data = await this.rdb.brpopAsync(this.urn, wait_time);
    if (data) {
      this.rdb.del(this.urn);
      const result = JSON.parse(data[1]);
      this.__result = result;
      return true;
    } else {
      return false;
    }
  }
}
