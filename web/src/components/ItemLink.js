import React from "react";
import { Link } from "react-router-dom";

const ItemLink = props => {
  return (
    <Link to={{ pathname: "/item/" + props.item._id, state: props.state }}>
      {props.item.entry_id.name + "/" + props.item.name}
    </Link>
  );
};

export default ItemLink;
