import PhotoSwipe from 'photoswipe';
import PhotoSwipeUI_Default from 'photoswipe/dist/photoswipe-ui-default';

import 'photoswipe/dist/photoswipe.css';

var imageSrc = 'data:' + mimeType + ';base64, ' + fileBase64;

var image = document.getElementById('image');
image.onload = () => {
  var pswpElement = document.querySelectorAll('.pswp')[0];

  var items = [
    {
      src: imageSrc,
      w: image.naturalWidth,
      h: image.naturalHeight,
    },
  ];

  var options = {
    index: 0,
    pinchToClose: false,
    closeOnScroll: false,
    closeOnVerticalDrag: false,
    escKey: false,
    tapToClose: false,
    closeElClasses: [],
    clickToCloseNonZoomable: false,
    shareEl: false,
    fullscreenEl: false,
    closeEl: false,
  };

  var gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
  gallery.init();
};
image.src = imageSrc;
