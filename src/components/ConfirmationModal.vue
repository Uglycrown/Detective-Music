<template>
  <div class="modal-overlay" v-if="isOpen" @click.self="cancel">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="modal-close" @click="cancel">×</button>
      </div>
      <div class="modal-content">
        <p>{{ message }}</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-cancel" @click="cancel">Cancel</button>
        <button class="btn btn-confirm" @click="confirm">Confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  title: {
    type: String,
    default: 'Confirm Action'
  },
  message: {
    type: String,
    default: 'Are you sure?'
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const confirm = () => {
  emit('confirm');
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
/* Using similar styling to the existing modal in App.vue for consistency */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 0;
  min-width: 400px;
  max-width: 90vw;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-content {
  padding: 24px;
  font-size: 16px;
  color: #b3b3b3;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  padding: 24px;
  background: rgba(0,0,0,0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  gap: 12px;
}

.btn {
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-confirm {
  background: #e53935; /* A nice red for confirmation */
  color: white;
}

.btn-confirm:hover {
  background: #f44336;
}
</style>
