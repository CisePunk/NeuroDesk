package com.neurodesk.app.neurodesk.repository;

import com.neurodesk.app.neurodesk.entity.TaskStudio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskStudioRepository extends JpaRepository<TaskStudio, Long> {
    List<TaskStudio> findByStudenteId(Long studenteId);

    List<TaskStudio> findByModuloId(Long moduloId);
}
