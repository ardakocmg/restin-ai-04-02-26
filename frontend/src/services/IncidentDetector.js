// Auto Incident Detection Service
import axios from 'axios';

class IncidentDetector {
  constructor(venueId, token) {
    this.venueId = venueId;
    this.token = token;
    this.backendUrl = process.env.REACT_APP_BACKEND_URL;
    this.monitorInterval = null;
    this.deviceStates = new Map();
  }

  start() {
    this.monitorInterval = setInterval(() => {
      this.checkDeviceHealth();
      this.checkPrinterQueue();
      this.checkKDSBacklog();
    }, 30000); // Every 30 seconds
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }

  async checkDeviceHealth() {
    try {
      const response = await axios.get(
        `${this.backendUrl}/api/venues/${this.venueId}/devices`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      
      const devices = response.data;
      const now = new Date();
      
      for (const device of devices) {
        const lastSeen = new Date(device.last_seen_at || 0);
        const minutesOffline = (now - lastSeen) / 1000 / 60;
        
        // Device offline for >5 minutes
        if (minutesOffline > 5 && device.status === 'online') {
          await this.createIncident({
            type: 'device_offline',
            severity: device.device_type === 'printer' ? 'high' : 'medium',
            title: `${device.name} Offline`,
            description: `Device has been offline for ${Math.floor(minutesOffline)} minutes`,
            device_id: device.id
          });
        }
      }
    } catch (error) {
      console.error('Device health check failed:', error);
    }
  }

  async checkPrinterQueue() {
    try {
      const response = await axios.get(
        `${this.backendUrl}/api/venues/${this.venueId}/print-jobs?status=pending`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      
      const jobs = response.data;
      const now = new Date();
      
      // Check for stuck print jobs (>10 min pending)
      const stuckJobs = jobs.filter(job => {
        const created = new Date(job.created_at);
        return (now - created) / 1000 / 60 > 10;
      });
      
      if (stuckJobs.length > 0) {
        await this.createIncident({
          type: 'printer_stuck',
          severity: 'high',
          title: 'Printer Jobs Stuck',
          description: `${stuckJobs.length} print jobs pending for >10 minutes`
        });
      }
    } catch (error) {
      console.error('Printer queue check failed:', error);
    }
  }

  async checkKDSBacklog() {
    try {
      const response = await axios.get(
        `${this.backendUrl}/api/venues/${this.venueId}/kds/tickets`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      
      const tickets = response.data;
      const now = new Date();
      
      // Check for tickets pending >20 min
      const lateTickets = tickets.filter(ticket => {
        if (ticket.status !== 'pending') return false;
        const created = new Date(ticket.created_at);
        return (now - created) / 1000 / 60 > 20;
      });
      
      if (lateTickets.length > 3) {
        await this.createIncident({
          type: 'kitchen_backlog',
          severity: 'high',
          title: 'Kitchen Backlog',
          description: `${lateTickets.length} tickets pending for >20 minutes`
        });
      }
    } catch (error) {
      console.error('KDS backlog check failed:', error);
    }
  }

  async createIncident(incident) {
    // Check if similar incident already exists (dedup)
    const incidentKey = `${incident.type}-${incident.device_id || 'general'}`;
    
    if (this.deviceStates.has(incidentKey)) {
      return; // Already reported
    }
    
    try {
      await axios.post(
        `${this.backendUrl}/api/venues/${this.venueId}/incidents`,
        { venue_id: this.venueId, ...incident },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      
      this.deviceStates.set(incidentKey, Date.now());
      
      // Clear dedup after 30 min
      setTimeout(() => {
        this.deviceStates.delete(incidentKey);
      }, 30 * 60 * 1000);
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  }
}

export default IncidentDetector;
