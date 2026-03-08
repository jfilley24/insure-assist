import streamlit as st
import pandas as pd
import datetime

st.set_page_config(page_title="WFA Agency Command Center", layout="wide", initial_sidebar_state="expanded")

# --- CSS Styling ---
st.markdown("""
<style>
    .metric-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        border-left: 5px solid #0056b3;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .alert-card {
        background-color: #fff3cd;
        border-radius: 8px;
        padding: 15px;
        border-left: 5px solid #ffc107;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        margin-bottom: 10px;
    }
    .alert-critical {
        background-color: #f8d7da;
        border-left: 5px solid #dc3545;
    }
    .alert-success {
        background-color: #d1e7dd;
        border-left: 5px solid #198754;
    }
    .task-badge {
        font-size: 0.8em;
        padding: 3px 8px;
        border-radius: 12px;
        background-color: #e9ecef;
        color: #495057;
    }
</style>
""", unsafe_allow_html=True)

# --- Sidebar ---
with st.sidebar:
    st.markdown("## 🛡️ WFA Command Center")
    st.info("**Agent:** Michael Vance\n\n**Role:** Senior Broker")
    
    st.markdown("---")
    st.markdown("### 🤖 Active AI Swarm")
    st.metric(label="Telephony Agents Online", value="2 Active", delta="Stable")
    st.metric(label="Virtual Portal Agents", value="14 Sessions", delta="+3", delta_color="normal")
    st.metric(label="Background Processors", value="Assigned", delta="Endorsements")

# --- Main Content ---
st.title("WFA Centralized Operations Dashboard")
st.markdown("Monitor your AI workforce, handle human escalations, and dispatch multi-modal tasks.")

# --- Top KPI Metrics ---
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.markdown('<div class="metric-card"><h4>📞 Calls Handled (Today)</h4><h2>142</h2><p style="color:green; margin:0;">+12% vs Yesterday</p></div>', unsafe_allow_html=True)
with col2:
    st.markdown('<div class="metric-card"><h4>✅ Tasks Auto-Resolved</h4><h2>89%</h2><p style="color:green; margin:0;">Omni-Agent Deflection</p></div>', unsafe_allow_html=True)
with col3:
    st.markdown('<div class="metric-card"><h4>⚠️ Human Escalations</h4><h2>15</h2><p style="color:red; margin:0;">Requires Broker Action</p></div>', unsafe_allow_html=True)
with col4:
    st.markdown('<div class="metric-card"><h4>⏱️ Avg Resolution Time</h4><h2>1.2 min</h2><p style="color:green; margin:0;">-4.5 min vs Human Baseline</p></div>', unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# --- Main Layout: Notifications & Dispatch ---
left_col, right_col = st.columns([2, 1])

with left_col:
    st.subheader("🚨 Priority Action Required (Escalations)")
    
    # Fake Alert 1
    st.markdown("""
    <div class="alert-card alert-critical">
        <h4>🚨 FNOL Escalation: Severe Accident</h4>
        <p><strong>Client:</strong> John Smith (Policy #PA-99281)</p>
        <p><strong>Omni-Agent Note:</strong> Client called in highly distressed. Two-car collision, injuries reported. AI successfully collected location and dispatched tow truck, but human empathy call is required immediately per WFA protocols.</p>
        <span class="task-badge">Outbound Call Required</span>
    </div>
    """, unsafe_allow_html=True)
    colA, colB = st.columns([1, 4])
    with colA: st.button("Take Ownership", key="btn1")
    with colB: st.button("View AI Call Transcript", key="btn1b")
    
    
    # Fake Alert 2
    st.markdown("""
    <div class="alert-card">
        <h4>⚠️ Carrier Endorsement Rejected</h4>
        <p><strong>Client:</strong> Sarah Jenkins (Policy #HO-44129)</p>
        <p><strong>System Note:</strong> Virtual Agent successfully collected photo of new roof, but Safeco automated system rejected the update due to "Unclear Edge Flashing". Please review the photo manually and override with underwriter.</p>
        <span class="task-badge">Manual Review</span>
    </div>
    """, unsafe_allow_html=True)
    colC, colD = st.columns([1, 4])
    with colC: st.button("Review Uploaded Photo", key="btn2")
    with colD: st.button("Clear Alert", key="btn2b")

    # Fake Alert 3
    st.markdown("""
    <div class="alert-card alert-success">
        <h4>✅ Cross-System Task Complete: Photo Uploaded</h4>
        <p><strong>Client:</strong> Marcus Johnson (Policy #PA-11094)</p>
        <p><strong>System Note:</strong> The automated outbound telephony run requested a photo of the vehicle's VIN. Client just uploaded the photo via the Virtual Agent portal. AI has verified the VIN matches.</p>
        <span class="task-badge">Ready to Bind</span>
    </div>
    """, unsafe_allow_html=True)
    st.button("Review & Bind Coverage", key="btn3")


with right_col:
    st.subheader("📡 Cross-System Task Dispatcher")
    st.markdown("Trigger an outbound AI call to push a specific request to a client's portal.")
    
    with st.container(border=True):
        st.selectbox("Select Client", ["Jane Doe (HO-88421)", "Marcus Johnson (PA-11094)", "Acme Corp (BOP-9912)"])
        task_type = st.selectbox("Request Type", ["Upload Photo (Damage)", "Upload Photo (VIN/Documentation)", "Sign Document (E-Sign)", "Update Payment Info"])
        
        st.text_area("Specific Instructions for Virtual Agent", placeholder="e.g., We need a wide shot of the basement showing the water level against the drywall.")
        
        st.markdown("**Action Sequence:**")
        st.caption("1. 📞 AI Outbound call placed to client.")
        st.caption(f"2. 📱 SMS sent with deep-link to `{task_type}` portal tab.")
        st.caption("3. 👁️ Virtual Agent awaits client interaction.")
        
        if st.button("🚀 Dispatch AI Request", type="primary", use_container_width=True):
            st.success("Request dispatched to Omni-Agent queue.")

st.markdown("---")

# --- Live Data Feed ---
st.subheader("Live Agent Telemetry")
st.caption("Real-time log of background AI actions.")

fake_logs = pd.DataFrame(
    [
        {"Time": "13:41:02", "Agent Type": "Telephony Inbound", "Action": "Answered Call", "Detail": "Client requested ID Card", "Status": "Success"},
        {"Time": "13:38:15", "Agent Type": "Virtual Portal Agent", "Action": "Verified Policy limits", "Detail": "Explained water backup coverage", "Status": "Success"},
        {"Time": "13:35:50", "Agent Type": "Telephony Outbound", "Action": "Renewal Nudge", "Detail": "Left Voicemail regarding 30-day renewal", "Status": "Complete"},
        {"Time": "13:22:10", "Agent Type": "Background Processor", "Action": "Endorsement", "Detail": "Added 2024 Honda Civic", "Status": "Pending Carrier"},
        {"Time": "13:10:05", "Agent Type": "Virtual Portal Agent", "Action": "Image Upload", "Detail": "Verified VIN plate photo", "Status": "Success"},
    ]
)

st.dataframe(fake_logs, use_container_width=True, hide_index=True)
