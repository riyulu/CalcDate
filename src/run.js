// const { tableData, tableFields, holidaysTable, holidaysTableFiels } = require('/data.js');
// import data from './data.js';
import { calcWorkDate, getWorkDate, calcIndex } from './date.js';

// const { tableData, tableFields, holidaysTable, holidaysTableFiels } = data;

class Node {
  constructor(recordId, id) {
    this.recordId = recordId;
    this.id = id;
    this.parent = null;
    this.children = [];
    this.childrenNode = [];
    this.preposeParent = null;
    this.preposes = [];
    this.preposesNode = [];
    this.startDate = 0;
    this.endDate = 0;
    this.duration = 0;
    this.updateTime = 0;
    this.needUpdate = false; // 局部属性，可改为函数局部变量
    this.hasUpdate = false;
    this.fail = false;
  }
}

class Result {
  constructor(error = false, msg = '', data = []) {
    this.error = error;
    this.msg = msg;
    this.data = data;
  }
}

// const fieldKeys = {};
const workDate = [];

const isNeedUpdate = (node, start, end) => node.startDate !== start || node.endDate !== end;

function dfsTree(node, ancestors, path, updateNodes, tipNodes) {
  if (ancestors.has(node)) {
    path.push(node.id);
    return true;
  }

  if (node.hasUpdate || !node.id) {
    return false;
  }

  let childStartTime = Number.MAX_VALUE;
  let childEndTime = 0;
  let childUpdateTime = 0;
  let fail = false;
  ancestors.add(node);
  path.push(node.id);
  if (node.childrenNode.length) {
    let duration = 0;
    for (let child of node.childrenNode) {
      if (dfsTree(child, ancestors,  path, updateNodes, tipNodes)) {
        return true;
      }

      // 子任务失败，当前任务也失败
      if (child.fail) {
        fail = true;
      }

      // 子任务更新时间
      childStartTime = Math.min(childStartTime, child.startDate);
      childEndTime = Math.max(childEndTime, child.endDate);
      childUpdateTime = Math.max(childUpdateTime, child.updateTime);
      duration += child.duration;
    }
    // 原本工时不存在，才会更新
    if (node.duration !== duration) {
      node.duration = duration;
      node.needUpdate = true;
    }
  }

  // 子任务才计算前置，父任务忽略前置
  let preposeEndTime = 0;
  if (node.parent || !node.childrenNode.length) {
    for (let child of node.preposesNode) {
      if (dfsTree(child, ancestors, path, updateNodes, tipNodes)) {
        return true;
      }
      // 前置任务失败，当前任务也失败
      if (child.fail) {
        fail = true;
      }

      preposeEndTime = Math.max(preposeEndTime, child.endDate);
    }
  }

  // 子任务和前置任务成功，才计算当前节点的启动时间和结束时间
  if (!fail) {
    // 有子任务，则取子任务的最早启动时间和最晚结束时间
    if (node.childrenNode.length) {
      // 不存在启动时间，或者子任务的更新时间大于当前任务的更新时间，则更新当前任务的启动时间和结束时间
      if (
        (!node.startDate || childUpdateTime >= node.updateTime) &&
        childStartTime < Number.MAX_VALUE &&
        childEndTime &&
        isNeedUpdate(node, childStartTime, childEndTime)
      ) {
        node.startDate = childStartTime;
        node.endDate = childEndTime;
        node.needUpdate = true;
      }
    } else if (node.duration && !isNaN(node.duration)) {
      let startDate = node.startDate;
      if (preposeEndTime) {
        const start = calcIndex(preposeEndTime, workDate);
        startDate = workDate[start + 1];
      }

      if (startDate) {
        const end = calcIndex(startDate, workDate);
        const duration = Math.ceil(node.duration);
        let endDate = workDate[end + duration - 1];
  
        if (endDate > workDate[workDate.length - 1]) {
          throw new Error('超出节假日计算范围，请检查节假日表添加新的年份');
        }

        if (isNeedUpdate(node, startDate, endDate)) {
          node.startDate = startDate;
          node.endDate = endDate;
          node.needUpdate = true;
        }
      } else {
        // 需要补充任务启动时间
        fail = true;
        tipNodes.add(node);
      }

    } else {
      // 需要补充任务工时
      fail = true;
      tipNodes.add(node);
    }
  }

  node.fail = fail;
  node.hasUpdate = true;
  // 记录需要更新的节点
  if (node.needUpdate) {
    updateNodes.add(node);
  }

  path.pop();
  ancestors.delete(node);
  return false;
}

const calcDate = (trees, updateNodes) => {
  let ancestors = new Set();
  const tipNodes = new Set();
  const path = [];

  for (let node of trees) {
    if (dfsTree(node, ancestors, path, updateNodes, tipNodes)) {
      const index = path.indexOf(path[path.length - 1]);
      return new Result(true, `存在循环依赖：${path.slice(index).join(' -> ')}，请检查`);
    }
  }

  if (tipNodes.size) {
    const ids = [];
    for (const value of tipNodes) {
      ids.push(value.id);
    }
    return new Result(true,`序号：${ids} 项异常，请检查是否工时为0，或者没有启动时间`);
  }

  return new Result();
};

const calcFieldKeys = (tableFields = []) => {
  const fieldKeys = {};

  tableFields.map((field) => {
    switch (field.name) {
      case '序号':
        fieldKeys['id'] = field.id;
        break;
      case '预估工时（天）':
        fieldKeys['duration'] = field.id;
        break;
      case '子记录':
        fieldKeys['child'] = field.id;
        break;
      case '预计启动时间':
        fieldKeys['startDate'] = field.id;
        break;
      case '预计结束时间':
        fieldKeys['endDate'] = field.id;
        break;
      case '前置任务ID':
        fieldKeys['prepose'] = field.id;
        break;
      case '最后更新时间':
        fieldKeys['updateTime'] = field.id;
        break;
      default:
        break;
    }
  });
  // console.log(`Table: fieldKeys:  `, fieldKeys);
  return fieldKeys;
};

const buildDependencyTree = (records = [], fieldKeys) => {
  const trees = [];
  if (!Array.isArray(records)) return trees;

  const nodeMaps = new Map();
  const nodes = records.map((record) => {
    const { fields, recordId } = record;
    const node = new Node(recordId, fields[fieldKeys.id]);
    node.updateTime = fields[fieldKeys.updateTime] || 0;
    node.startDate = fields[fieldKeys.startDate] || 0;
    node.endDate = fields[fieldKeys.endDate] || 0;
    node.duration = fields[fieldKeys.duration] || 0;

    const preposes = fields[fieldKeys.prepose];
    if (preposes && Array.isArray(preposes.recordIds) && preposes.recordIds.length) {
      node.preposes = preposes.recordIds;
    }

    const children = fields[fieldKeys.child];
    if (children && Array.isArray(children.recordIds) && children.recordIds.length) {
      node.children = children.recordIds;
    }

    nodeMaps.set(recordId, node);
    return node;
  });

  nodes.forEach((node) => {
    if (node.children.length) {
      node.children.forEach((recordId) => {
        const childNode = nodeMaps.get(recordId);
        childNode.parent = node;
        node.childrenNode.push(childNode);
      });
    }

    if (node.preposes.length) {
      node.preposes.forEach((recordId) => {
        const preposeNode = nodeMaps.get(recordId);
        preposeNode.preposeParent = node;
        node.preposesNode.push(preposeNode);
      });
    }
  });

  // nodes.forEach((node) => {
  //   if (!node.parent || !node.preposeParent) {
  //     trees.push(node);
  //   }
  // });

  // console.log(trees);
  return nodes;
};

export const init = (holidaysTable, holidaysTableFiels) => {
  const holidays = calcWorkDate(holidaysTable, holidaysTableFiels);
  Object.keys(holidays)
    .sort()
    .forEach((key) => {
      const days = getWorkDate(key, holidays[key]);
      if (Array.isArray(days)) {
        workDate.push(...days);
      }
    });
}

export const updateDate = (data = tableData, fieldsData = tableFields) => {
  if (!data || !Array.isArray(data.records)) return new Result(true, '表格数据为空');


  const records = data.records;
  // console.log(records);
  const fieldKeys = calcFieldKeys(fieldsData);
  const trees = buildDependencyTree(records, fieldKeys);
  const updateNodes = new Set();
  const result = calcDate(trees, updateNodes);

  const newRecords = [];
  for (let node of updateNodes) {
    const fields = { [fieldKeys.duration]: node.duration }
    if (node.startDate) {
      fields[fieldKeys.startDate] = node.startDate;
    }
    if (node.endDate) {
      fields[fieldKeys.endDate] = node.endDate;
    }
    
    const record = {
      recordId: node.recordId,
      fields: fields,
    };
    newRecords.push(record);
  }

  if (result.error) {
    console.log(result.msg);
    result.data = newRecords;
    return result;
  }

  return new Result(false, '更新成功', newRecords);
}

// main();

export default {
  updateDate,
  init,
};
