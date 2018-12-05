let throttle = require('lodash/throttle');

class itemSlider {
  constructor(options) {
    this.slider = options.el;
    this.list = this.slider.querySelector('ul');
    if (options.class) this.classList = options.class.split(" ");
    this.disabled = false;
    this.init();
    this.bindHandlers();
  }

  init() {
    if (this.classList && this.classList.length) this.slider.classList.add(...this.classList);
    this.slider.classList.add('slider_disable-left');

    const sliderContainer = document.createElement('div');
    sliderContainer.classList.add('slider__container');
    sliderContainer.appendChild(this.list);

    this.slider.innerHTML = '<button class="slider__arrow slider__arrow_left"></button>' +
        '<button class="slider__arrow slider__arrow_right"></button>';

    this.slider.appendChild(sliderContainer);

    this.innerWidth = this.countInnerWidth();
    this.arrowLeft = this.slider.querySelector('.slider__arrow_left');
    this.arrowRight = this.slider.querySelector('.slider__arrow_right');

  }

  countInnerWidth() {
    return [...this.list.querySelectorAll('li')].reduce((sum, item) => {
      const style = window.getComputedStyle(item);
      const width = item.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      return sum + width;
    }, 0);
  }

  bindHandlers() {
    this.transformX = 0;
    this.arrowLeft.addEventListener('click', () => {
      this.transformX -= this.list.clientWidth;
      if (this.transformX < 0) this.transformX = 0;
      this.render();
    });

    this.arrowRight.addEventListener('click', () => {
      this.transformX = Math.min(this.transformX + this.list.clientWidth, this.list.scrollWidth - this.list.clientWidth);
      this.render();
    });

    window.addEventListener('resize', throttle(() => {
      this.onResize();
    }, 200));

    this.onResize();
  }


  onResize() {
    if (!this.disabled && (this.innerWidth <= this.list.offsetWidth)) {
      this.slider.classList.add('slider_disabled');
      this.disabled = true;
      if (this.transformX > 0) {
        this.transformX = 0;
        if (this.slider.classList.contains('slider_disable-right')) this.slider.classList.remove('slider_disable-right');
        this.render();
      }
    } else if (this.disabled && (this.innerWidth > this.list.offsetWidth)) {
      this.slider.classList.remove('slider_disabled');
      if (this.slider.classList.contains('slider_disable-right')) this.slider.classList.remove('slider_disable-right');
      this.disabled = false;
    }
  }

  render() {
    this.list.style.transform = this.transformX > 0 ? `translateX(${-this.transformX}px)` : 'translateX(0)';

    if (this.transformX === 0) {
      this.slider.classList.add('slider_disable-left');
    } else {
      this.slider.classList.remove('slider_disable-left');
    }

    if (this.transformX == this.list.scrollWidth - this.list.clientWidth) {
      this.slider.classList.add('slider_disable-right');
    } else {
      this.slider.classList.remove('slider_disable-right');
    }
  }
}

module.exports = itemSlider;
