/* Temporary loader: restore last good dashboard JS after PLACEHOLDER mishap. */
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/gh/rubendiedericks24-eng/RD-Inevstment-Holdings-@210979731bea51d6380ef6fb7b38a2c65f7438e0/operations-dashboard.js';
  s.onerror=function(){
    var t=document.createElement('script');
    t.src='https://raw.githubusercontent.com/rubendiedericks24-eng/RD-Inevstment-Holdings-/210979731bea51d6380ef6fb7b38a2c65f7438e0/operations-dashboard.js';
    document.head.appendChild(t);
  };
  document.head.appendChild(s);
})();
