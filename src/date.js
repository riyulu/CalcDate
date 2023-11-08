
const isLeapYear = (year) => {
  if (year % 400 === 0) {
    return true;
  } else if (year % 100 === 0) {
    return false;
  } else if (year % 4 === 0) {
    return true;
  } else {
    return false;
  }
}

const getMonth = (year) => {
  if (isLeapYear(year)) return [31, 29, 31, 30, 31, 30, 31, 31, 30 ,31, 30, 31];
  return [31, 28, 31, 30, 31, 30, 31, 31, 30 ,31, 30, 31];
}

const holidays = {};
export const getWorkDate = (year, holidays = holidays[year]) => {
  const workDate = [];
  const month = getMonth(year);
  let z = 0;
  for (let i = 0; i < month.length; i++) {
    for (let j = 0; j < month[i]; j++) {
      const date = new Date(year, i, j + 1);
      const days = holidays[z]
      // 排期节假日
      if (days && days.date === date.getTime()) {
        z++;
        if (days.work) {
          workDate.push(days.date);
        }
        continue;
      }

      if (date.getDay() !== 0 && date.getDay() !== 6) {
        workDate.push(date.getTime());
      }
    }
  }

  // console.log(`workDate: `, workDate);
  return workDate;
}

const calcFieldKeys = (tableFields = []) => {
  const fieldKeys = {};

  tableFields.map((field) => {
    switch (field.name) {
      case '节假日日期':
        fieldKeys['date'] = field.id;
        break;
      case '节假日类型':
        fieldKeys['type'] = field.id;
        break;
      default:
        break;
    }
  });
  // console.log(`Holiday Table: fieldKeys:  `, fieldKeys);
  return fieldKeys;
};

export const calcWorkDate = (holidaysTable, holidaysTableFiels = []) => {
  if (!holidaysTable || !Array.isArray(holidaysTable.records)) return holidays;
  const fieldKeys = calcFieldKeys(holidaysTableFiels);
  const records = holidaysTable.records.sort((a, b) => a.fields[fieldKeys['date']] - b.fields[fieldKeys['date']]);
  
  for(let i = 0; i < records.length; i++) {
    const record = records[i];
    const date = record.fields[fieldKeys['date']];
    const type = record.fields[fieldKeys['type']];
    if (!date || !type) continue;

    const year = new Date(date).getFullYear();
    if (!holidays[year]) holidays[year] = [];

    const days = { date, work: false };
    if (type.text === '调休上班日') {
      days.work = true;
    }

    holidays[year].push(days);
  }
  
  return holidays;
}

export const calcIndex = (target, workdays) => {
  if (!Array.isArray(workdays)) return 0;
  
  let left = 0;
  let right = workdays.length - 1;

  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    let curr = workdays[mid];

    if (curr === target) {
      return mid;
    } else if (curr < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // 未找到指定日期，则返回大于指定日期的第一个日期
  return left;
}