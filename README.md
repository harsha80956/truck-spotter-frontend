# TruckSpotter Frontend - Trip Planning & ELD Logs UI

This is the frontend application for TruckSpotter, designed to help truck drivers plan their trips efficiently while staying compliant with Hours of Service (HOS) regulations. The application provides a user-friendly interface for trip planning, route visualization, and ELD log generation.

## Features

- **Trip Planning Interface**: Input current location, pickup, and dropoff points to plan trips
- **Interactive Maps**: Visualize routes with stops and rest periods
- **ELD Log Visualization**: View and interact with generated ELD logs in a format similar to paper logbooks
- **HOS Compliance**: Track hours of service compliance with visual indicators
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- React 18.2.0
- TypeScript
- Redux Toolkit & RTK Query for state management
- Vite for fast development and building
- React Router for navigation
- Tailwind CSS for styling
- Leaflet for maps

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository and navigate to the frontend directory
```bash
git clone https://github.com/yourusername/truckspotter.git
cd truckspotter/frontend
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
Create a `.env` file in the frontend directory with the following variables:
```
VITE_API_URL=http://localhost:8000/api
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Application Structure

```
frontend/
├── public/             # Static files
├── src/
│   ├── api/            # API services
│   ├── components/     # Reusable components
│   │   ├── TripPlanner.tsx  # Main trip planning component
│   │   └── ui/         # UI components
│   ├── hooks/          # Custom hooks
│   │   └── useApi.ts   # API integration hook
│   ├── pages/          # Page components
│   ├── store/          # Redux store
│   │   ├── api/        # RTK Query API slices
│   │   ├── hooks.ts    # Redux hooks
│   │   └── slices/     # Redux slices
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── package.json
└── vite.config.ts
```

## Key Components

### TripPlanner
The main component for planning trips. It allows users to:
- Input current location, pickup, and dropoff locations
- Geocode addresses to coordinates
- Set current cycle hours and duty status
- Calculate routes with HOS compliance
- View trip details and ELD logs

### ELD Log Visualization
The application provides a visual representation of ELD logs, including:
- Duty status timeline (Off Duty, Sleeper Berth, Driving, On Duty)
- Time markers for status changes
- Mileage accumulation visualization
- Speed indicators for driving segments
- Interactive tooltips with detailed information

## Redux Store Structure

### Location Slice
Manages location data including current, pickup, and dropoff locations.

### Trip Slice
Manages trip data including current trip, route segments, and trip history.

### ELD Log Slice
Manages ELD log data including daily logs and log entries.

## API Integration

The application uses RTK Query for API integration, with the following endpoints:

- **Geocode**: Convert addresses to coordinates
- **Plan Trip**: Calculate routes with HOS compliance
- **Generate ELD Logs**: Generate ELD logs for a trip
- **Get Trips**: Retrieve trip history
- **Get Daily Logs**: Retrieve ELD logs for a trip

## HOS Regulations

The application visualizes compliance with the following Hours of Service regulations:

- Property-carrying drivers are limited to 11 hours of driving after 10 consecutive hours off duty
- Drivers may not drive beyond the 14th consecutive hour after coming on duty
- Drivers may not drive after 60/70 hours on duty in 7/8 consecutive days
- Drivers must take a 30-minute break when they have driven for a period of 8 cumulative hours without at least a 30-minute interruption

## Development

### Building for Production
```bash
npm run build
# or
yarn build
```

### Linting
```bash
npm run lint
# or
yarn lint
```

### Type Checking
```bash
npm run typecheck
# or
yarn typecheck
```

## Deployment

The frontend can be deployed to various platforms:

- Vercel: The project includes a `vercel.json` configuration file for easy deployment to Vercel
- Netlify: The project can be deployed to Netlify with minimal configuration
- AWS: The project can be deployed to AWS using S3 and CloudFront

## License

This project is licensed under the MIT License - see the LICENSE file for details. 