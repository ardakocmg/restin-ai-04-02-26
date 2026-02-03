import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Activity, Database, Server, Wifi, HardDrive, CheckCircle, AlertCircle } from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import edgeGatewayClient from '../../services/EdgeGatewayClient';

export default function MonitoringDashboard() {
  const [edgeHealth, setEdgeHealth] = useState(null);

  const loadEdgeHealth = async () => {
    const edgeAvailable = await edgeGatewayClient.checkEdgeAvailability();
    if (edgeAvailable) {
      const stats = await edgeGatewayClient.getQueueStats();
      setEdgeHealth(stats);
    }
  };

  useEffect(() => {
    loadEdgeHealth();
    const interval = setInterval(loadEdgeHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: 'FastAPI Backend', status: 'healthy', uptime: '99.9%', responseTime: '45ms' },
    { name: 'MongoDB', status: 'healthy', uptime: '100%', responseTime: '12ms' },
    { name: 'Edge Gateway', status: 'healthy', uptime: '98.5%', responseTime: '8ms' },
    { name: 'Device Mesh', status: 'active', uptime: '97.2%', responseTime: '15ms' },
  ];

  return (
    <PageContainer title="Service Monitoring" description="Real-time system monitoring">
      <div className="space-y-6">
        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle>Services Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5" style={{ color: '#4ADE80' }} />
                    <div>
                      <h4 className="font-medium" style={{ color: '#F5F5F7' }}>{service.name}</h4>
                      <p className="text-xs" style={{ color: '#A1A1AA' }}>Response: {service.responseTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium" style={{ color: '#D4D4D8' }}>{service.uptime}</div>
                      <p className="text-xs" style={{ color: '#71717A' }}>uptime</p>
                    </div>
                    <Badge variant="default">{service.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>CPU Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: '#A1A1AA' }}>Backend</span>
                  <span style={{ color: '#F5F5F7' }}>23%</span>
                </div>
                <Progress value={23} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: '#A1A1AA' }}>Edge Gateway</span>
                  <span style={{ color: '#F5F5F7' }}>12%</span>
                </div>
                <Progress value={12} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: '#A1A1AA' }}>Backend</span>
                  <span style={{ color: '#F5F5F7' }}>45%</span>
                </div>
                <Progress value={45} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span style={{ color: '#A1A1AA' }}>MongoDB</span>
                  <span style={{ color: '#F5F5F7' }}>34%</span>
                </div>
                <Progress value={34} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Offline Queue Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-2" style={{ color: '#FB8C00' }} />
                <div className="text-3xl font-bold" style={{ color: '#F5F5F7' }}>{edgeHealth?.stats?.pending || 0}</div>
                <p className="text-sm" style={{ color: '#A1A1AA' }}>Pending</p>
              </div>
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: '#4ADE80' }} />
                <div className="text-3xl font-bold" style={{ color: '#F5F5F7' }}>{edgeHealth?.stats?.synced || 0}</div>
                <p className="text-sm" style={{ color: '#A1A1AA' }}>Synced</p>
              </div>
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" style={{ color: '#EF4444' }} />
                <div className="text-3xl font-bold" style={{ color: '#F5F5F7' }}>{edgeHealth?.stats?.failed || 0}</div>
                <p className="text-sm" style={{ color: '#A1A1AA' }}>Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
