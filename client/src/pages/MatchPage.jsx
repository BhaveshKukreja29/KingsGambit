// client/src/pages/MatchDetailPage.jsx
import React from 'react';
import { useParams } from 'react-router-dom';

const MatchPage = () => {
  const { id } = useParams(); // Get the match ID from the URL
  return (
    <div>
      <h2>Match Details</h2>
      <p>Details for Match ID: {id}</p>
      {/* Here you'd fetch and display specific match data */}
    </div>
  );
};

export default MatchPage;