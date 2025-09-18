<template>
  <div v-if="isVisible" class="image-modal-overlay" @click="closeModal">
    <div class="image-modal-container" @click.stop>
      <button class="close-btn" @click="closeModal">&times;</button>
      <img :src="imageSrc" alt="放大图片" class="modal-image" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'ImageModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    imageSrc: {
      type: String,
      default: ''
    }
  },
  watch: {
    isVisible(newVal) {
      if (newVal) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
    document.body.style.overflow = ''
  },
  methods: {
    closeModal() {
      this.$emit('close')
    },
    handleKeydown(event) {
      if (this.isVisible && event.key === 'Escape') {
        this.closeModal()
      }
    }
  }
}
</script>

<style scoped>
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.image-modal-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  transition: all 0.2s;
}

.close-btn:hover {
  background: white;
  transform: scale(1.1);
}

.modal-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
</style> 