<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>Set Sleep Timer</h3>
      <div class="timer-options">
        <button @click="setTimer(15)">15 minutes</button>
        <button @click="setTimer(30)">30 minutes</button>
        <button @click="setTimer(60)">60 minutes</button>
      </div>
      <button @click="$emit('close')">Close</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SleepTimerModal',
  methods: {
    setTimer(minutes) {
      this.$emit('set-timer', minutes);
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
}

.timer-options {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
</style>
