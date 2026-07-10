import type { TemplatePreset } from '../types';

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'alert-tip',
    name: 'Tip Alert',
    description: 'Classic tip notification with slide-in animation',
    icon: '💰',
    category: 'Alerts',
    html: `<div class="tip-alert" id="tip-alert">
  <div class="tip-icon">💰</div>
  <div class="tip-content">
    <div class="tip-username" id="username">Username</div>
    <div class="tip-text">sent a tip!</div>
    <div class="tip-amount" id="amount">$5.00</div>
    <div class="tip-message" id="message">Great stream!</div>
  </div>
</div>`,
    css: `body {
  margin: 0;
  background: transparent;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
}

.tip-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tip-alert.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.tip-icon {
  font-size: 40px;
}

.tip-content {
  color: white;
}

.tip-username {
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tip-text {
  font-size: 14px;
  opacity: 0.9;
}

.tip-amount {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
  margin: 4px 0;
}

.tip-message {
  font-size: 13px;
  opacity: 0.8;
  font-style: italic;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}`,
    js: `window.addEventListener('se-tip', function(e) {
  var data = e.detail || {};
  var user = data.user || {};
  
  document.getElementById('username').textContent = user.displayName || 'Anonymous';
  document.getElementById('amount').textContent = '$' + (data.amount / 100).toFixed(2);
  document.getElementById('message').textContent = data.message || 'Thanks for the tip!';
  
  var alert = document.getElementById('tip-alert');
  alert.classList.add('visible');
  
  setTimeout(function() {
    alert.classList.remove('visible');
  }, 5000);
});`,
  },
  {
    id: 'alert-follow',
    name: 'Follow Alert',
    description: 'New follower notification with pop effect',
    icon: '⭐',
    category: 'Alerts',
    html: `<div class="follow-alert" id="follow-alert">
  <div class="follow-star">⭐</div>
  <div class="follow-content">
    <div class="follow-text">New Follower!</div>
    <div class="follow-username" id="username">Username</div>
  </div>
</div>`,
    css: `body {
  margin: 0;
  background: transparent;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
}

.follow-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) scale(0);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 50px;
  box-shadow: 0 8px 30px rgba(245, 87, 108, 0.4);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.follow-alert.visible {
  transform: translateX(-50%) scale(1);
  opacity: 1;
}

.follow-star {
  font-size: 32px;
  animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { transform: scale(1); }
  to { transform: scale(1.2); }
}

.follow-content {
  color: white;
  text-align: center;
}

.follow-text {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.9;
}

.follow-username {
  font-size: 18px;
  font-weight: 700;
}`,
    js: `window.addEventListener('se-follower', function(e) {
  var data = e.detail || {};
  var user = data.user || {};
  
  document.getElementById('username').textContent = user.displayName || 'Someone';
  
  var alert = document.getElementById('follow-alert');
  alert.classList.add('visible');
  
  setTimeout(function() {
    alert.classList.remove('visible');
  }, 4000);
});`,
  },
  {
    id: 'alert-sub',
    name: 'Subscribe Alert',
    description: 'Subscription alert with glow effect',
    icon: '🎁',
    category: 'Alerts',
    html: `<div class="sub-alert" id="sub-alert">
  <div class="sub-icon">🎁</div>
  <div class="sub-content">
    <div class="sub-text">New Subscriber!</div>
    <div class="sub-username" id="username">Username</div>
    <div class="sub-tier" id="tier">Tier 1</div>
  </div>
</div>`,
    css: `body {
  margin: 0;
  background: transparent;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
}

.sub-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-150px);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 12px;
  box-shadow: 0 0 60px rgba(56, 239, 125, 0.5);
  opacity: 0;
  transition: all 0.5s ease;
}

.sub-alert.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.sub-icon {
  font-size: 36px;
}

.sub-content {
  color: white;
}

.sub-text {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.9;
}

.sub-username {
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.sub-tier {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
}`,
    js: `window.addEventListener('se-subscriber', function(e) {
  var data = e.detail || {};
  var user = data.user || {};
  var tier = parseInt(data.tier || '1000') / 1000;
  
  document.getElementById('username').textContent = user.displayName || 'Someone';
  document.getElementById('tier').textContent = 'Tier ' + tier;
  
  var alert = document.getElementById('sub-alert');
  alert.classList.add('visible');
  
  setTimeout(function() {
    alert.classList.remove('visible');
  }, 5000);
});`,
  },
  {
    id: 'chat-box',
    name: 'Chat Box',
    description: 'Scrolling chat messages display',
    icon: '💬',
    category: 'Overlays',
    html: `<div class="chat-box" id="chat-box">
  <div class="chat-message">
    <span class="chat-username" style="color: #00d4ff;">StreamerBot:</span>
    <span class="chat-text">Welcome to the stream!</span>
  </div>
</div>`,
    css: `body {
  margin: 0;
  background: transparent;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
}

.chat-box {
  position: fixed;
  bottom: 20px;
  left: 20px;
  max-width: 350px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.chat-message {
  padding: 6px 8px;
  color: white;
  font-size: 13px;
  line-height: 1.4;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-username {
  font-weight: 700;
  margin-right: 6px;
}

.chat-text {
  color: rgba(255,255,255,0.9);
}`,
    js: `var chatMessages = [];
var maxMessages = 8;

window.addEventListener('se-chat', function(e) {
  var data = e.detail || {};
  var user = data.user || {};
  var message = data.message || '';
  var color = data.color || '#ffffff';
  
  var chatBox = document.getElementById('chat-box');
  
  var msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.innerHTML = '<span class="chat-username" style="color: ' + color + ';">' + (user.displayName || user.login || 'Anonymous') + ':</span><span class="chat-text">' + message + '</span>';
  
  chatBox.appendChild(msgEl);
  chatMessages.push(msgEl);
  
  while (chatMessages.length > maxMessages) {
    var old = chatMessages.shift();
    old.remove();
  }
  
  chatBox.scrollTop = chatBox.scrollHeight;
});`,
  },
  {
    id: 'goal-bar',
    name: 'Goal Bar',
    description: 'Animated progress goal bar',
    icon: '🎯',
    category: 'Goals',
    html: `<div class="goal-container">
  <div class="goal-header">
    <span class="goal-title">Follower Goal</span>
    <span class="goal-count" id="goal-count">850 / 1000</span>
  </div>
  <div class="goal-bar">
    <div class="goal-progress" id="goal-progress" style="width: 85%;"></div>
  </div>
</div>`,
    css: `body {
  margin: 0;
  background: transparent;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
}

.goal-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: white;
  font-size: 12px;
}

.goal-title {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.goal-count {
  color: #00ff88;
}

.goal-bar {
  height: 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
}

.goal-progress {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00d4ff);
  border-radius: 6px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}`,
    js: `window.addEventListener('se-goal_update', function(e) {
  var data = e.detail || {};
  var current = data.current || 0;
  var target = data.target || 1000;
  var percent = Math.min((current / target) * 100, 100);
  
  document.getElementById('goal-count').textContent = current + ' / ' + target;
  document.getElementById('goal-progress').style.width = percent + '%';
});`,
  },
  {
    id: 'cheer-alert',
    name: 'Cheer Alert',
    description: 'Bits cheer notification',
    icon: '📣',
    category: 'Alerts',
    html: `<div class="cheer-alert" id="cheer-alert">
  <div class="cheer-icon">📣</div>
  <div class="cheer-content">
    <div class="cheer-username" id="username">Username</div>
    <div class="cheer-text">cheered</div>
    <div class="cheer-bits" id="bits">1000 bits!</div>
    <div class="cheer-message" id="message">Let's go!</div>
  </div>
</div>`,
    css: `body {
  margin: 0;
  background: transparent;
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
}

.cheer-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateX(150%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(245, 175, 25, 0.4);
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cheer-alert.visible {
  transform: translateX(-50%) translateX(0);
  opacity: 1;
}

.cheer-icon {
  font-size: 40px;
  animation: shake 0.1s infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

.cheer-content {
  color: white;
}

.cheer-username {
  font-size: 18px;
  font-weight: 700;
}

.cheer-text {
  font-size: 12px;
  opacity: 0.9;
}

.cheer-bits {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.cheer-message {
  font-size: 13px;
  opacity: 0.8;
  font-style: italic;
}`,
    js: `window.addEventListener('se-cheer', function(e) {
  var data = e.detail || {};
  var user = data.user || {};
  
  document.getElementById('username').textContent = user.displayName || 'Someone';
  document.getElementById('bits').textContent = data.bits + ' bits!';
  document.getElementById('message').textContent = data.message || '';
  
  var alert = document.getElementById('cheer-alert');
  alert.classList.add('visible');
  
  setTimeout(function() {
    alert.classList.remove('visible');
  }, 5000);
});`,
  },
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATE_PRESETS.map(t => t.category))];
