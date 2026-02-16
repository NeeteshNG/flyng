import { Box, Grid, Card, CardContent, Typography, Paper } from '@mui/material'
import {
  Warehouse as WarehouseIcon,
  FlightTakeoff as DroneIcon,
  Inventory as InventoryIcon,
  Assignment as OrderIcon,
} from '@mui/icons-material'

const statsData = [
  { title: 'Warehouses', value: '0', icon: <WarehouseIcon />, color: '#1976d2' },
  { title: 'Active Drones', value: '0', icon: <DroneIcon />, color: '#9c27b0' },
  { title: 'Inventory Items', value: '0', icon: <InventoryIcon />, color: '#ed6c02' },
  { title: 'Pending Orders', value: '0', icon: <OrderIcon />, color: '#2e7d32' },
]

const Dashboard = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Welcome to FlyNG
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsData.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: `${stat.color}20`,
                      borderRadius: 2,
                      p: 1.5,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            <Typography color="text.secondary">
              No recent activity to display. Start by adding warehouses and drones.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Typography color="text.secondary">
              Quick action buttons will appear here as you set up your system.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
