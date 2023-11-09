<script>
import { bitable } from '@lark-base-open/js-sdk';
import { ref, onMounted } from 'vue';
import { ElButton, ElForm, ElFormItem, ElSelect, ElOption } from 'element-plus';
import { init, updateDate } from '../run.js';

export default {
  components: {
    ElButton,
    ElForm,
    ElFormItem,
    ElSelect,
    ElOption,
  },
  setup() {
    const formData = ref({ table: '' });
    const tableMetaList = ref([]);
    const errorTips = ref('');
    const tips = ref('');

    const clickUpdateDate = async () => {
      // console.log(formData.value)
      const tableId = formData.value.table;
      if (tableId) {
        try {
          errorTips.value = '';
          tips.value = '更新中...';
          const table = await bitable.base.getTableById(tableId);
          const tableData = await table.getRecords({ pageSize: 5000 });
          const tableFields = await table.getFieldMetaList();
          // console.log(tableFields, tableData);
          const result = updateDate(tableData, tableFields);
          // console.log(result)
          if (result.error) {
            errorTips.value = `错误提示：${result.msg}`;
          } else {
            const res = await table.setRecords(result.data);
            tips.value = `更新成功！`;
            // console.log(res);
          }
        } catch (error) {
          console.log(error);
          errorTips.value = `错误提示：${error.message}`;
        }
      }
    };

    onMounted(async () => {
      const [tableList, selection] = await Promise.all([bitable.base.getTableMetaList(), bitable.base.getSelection()]);
      // console.log(tableList, selection)
      formData.value.table = selection.tableId;
      tableMetaList.value = tableList;

      // tableList
      const holidays = tableList.filter((table) => table.name === '法定节假日安排');
      if (Array.isArray(holidays) && holidays[0]) {
        const tableId = holidays[0].id;
        const table = await bitable.base.getTableById(tableId);
        const [holidaysData, holidaysFields] = await Promise.all([
          table.getRecords({ pageSize: 5000 }),
          table.getFieldMetaList(),
        ]);
        init(holidaysData, holidaysFields);
        // console.log(holidaysData, holidaysFields);
      } else {
        errorTips.value = '错误提示：请先同步【法定节假日安排】表';
      }
    });

    return {
      formData,
      errorTips,
      tips,
      tableMetaList,
      clickUpdateDate,
    };
  },
};
</script>

<template>
  <el-form ref="form" class="form" :model="formData" label-position="top">
    <!-- <el-form-item label="开发指南">
      <a
        href="https://bytedance.feishu.cn/docx/HazFdSHH9ofRGKx8424cwzLlnZc"
        target="_blank"
        rel="noopener noreferrer"
      >
        多维表格插件开发指南
      </a>
      、
      <a
        href="https://lark-technologies.larksuite.com/docx/HvCbdSzXNowzMmxWgXsuB2Ngs7d"
        target="_blank"
        rel="noopener noreferrer"
      >
        Base Extensions Guide
      </a>
    </el-form-item>
    <el-form-item label="API">
      <a
        href="https://bytedance.feishu.cn/docx/HjCEd1sPzoVnxIxF3LrcKnepnUf"
        target="_blank"
        rel="noopener noreferrer"
      >
        多维表格插件API
      </a>
      、
      <a
        href="https://lark-technologies.larksuite.com/docx/Y6IcdywRXoTYSOxKwWvuLK09sFe"
        target="_blank"
        rel="noopener noreferrer"
      >
        Base Extensions Front-end API
      </a>
    </el-form-item> -->
    <el-form-item label="选择数据表" size="large">
      <el-select v-model="formData.table" placeholder="请选择数据表" style="width: 100%">
        <el-option v-for="meta in tableMetaList" :key="meta.id" :label="meta.name" :value="meta.id" />
      </el-select>
    </el-form-item>
    <el-button type="primary" plain size="large" @click="clickUpdateDate">排期更新</el-button>
    <el-form-item v-if="errorTips" size="large">
      <p style="color: red; padding-top: 20px">{{ errorTips }}</p>
    </el-form-item>
    <el-form-item v-else-if="tips" size="large">
      <p style="color: green; padding-top: 20px">{{ tips }}</p>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.form :deep(.el-form-item__label) {
  font-size: 16px;
  color: var(--el-text-color-primary);
  margin-bottom: 0;
}
.form :deep(.el-form-item__content) {
  font-size: 16px;
}
</style>
