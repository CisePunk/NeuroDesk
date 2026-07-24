package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findAllByOrderByCreatoIlDesc();
}
